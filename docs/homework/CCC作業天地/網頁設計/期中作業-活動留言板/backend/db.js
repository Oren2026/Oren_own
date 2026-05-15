/**
 * db.js — SQLite 資料庫初始化與資料訪問
 * 資安：所有寫入使用 parameterized queries，防止 SQL Injection
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'chatrank.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const database = getDb();

  // ── 使用者 ──────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      display_name TEXT   NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
    )
  `);

  // ── 文章 ────────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      title       TEXT    NOT NULL DEFAULT '',
      content     TEXT    NOT NULL,
      tags        TEXT    NOT NULL DEFAULT '[]',
      like_count  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
    )
  `);

  // ── 按讚 ────────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      user_id  INTEGER NOT NULL REFERENCES users(id),
      post_id  INTEGER NOT NULL REFERENCES posts(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
      PRIMARY KEY (user_id, post_id)
    )
  `);

  // ── 文章留言 ────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER NOT NULL REFERENCES posts(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      content     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
    )
  `);

  // ── 活動 ────────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      start_date  TEXT,
      location    TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
    )
  `);

  // ── 活動留言 ────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS activity_comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      content     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc'))
    )
  `);

  // ── CSRF Tokens ─────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS csrf_tokens (
      token   TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      expires INTEGER NOT NULL
    )
  `);

  // ── 系統設定（key-value）────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 預設值：gravity = 1.5
  database.exec(`INSERT OR IGNORE INTO settings (key, value) VALUES ('hot_gravity', '1.5')`);

  // ── 言論禁止清單 ─────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS blocked_words (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      word      TEXT    UNIQUE NOT NULL,
      created_at TEXT   NOT NULL DEFAULT (datetime('now', 'utc'))
    )
  `);

  // 建立索引，加速常見查詢
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created   ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
  `);

  console.log('[DB] 資料庫初始化完成');
  return database;
}

// ── 使用者 ──────────────────────────────────────────────────────

function createUser({ username, password, displayName }) {
  const database = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const stmt = database.prepare(
    'INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)'
  );
  try {
    const result = stmt.run(username, hash, displayName || username);
    return { id: result.lastInsertRowid, username, displayName: displayName || username };
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      throw new Error('USERNAME_EXISTS');
    }
    throw err;
  }
}

function getUserByUsername(username) {
  const database = getDb();
  return database.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  const database = getDb();
  return database.prepare('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?').get(id);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function getUserStats(userId) {
  const database = getDb();
  const postCount = database.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(userId).c;
  const commentCount = database.prepare('SELECT COUNT(*) as c FROM comments WHERE user_id = ?').get(userId).c;
  const activityCount = database.prepare('SELECT COUNT(*) as c FROM activities WHERE user_id = ?').get(userId).c;
  return { postCount, commentCount, activityCount };
}

// ── 文章 ─────────────────────────────────────────────────────────

function createPost({ userId, title, content }) {
  const database = getDb();
  // 自動從內容解析 #tag1#tag2 格式的標籤
  const tags = parseTags(content);
  const stmt = database.prepare(
    'INSERT INTO posts (user_id, title, content, tags) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(userId, title, content, JSON.stringify(tags));
  return result.lastInsertRowid;
}

function getPosts({ page = 1, limit = 20, userId = null, filterUserId = null, tag = null, username = null, sort = 'new' } = {}) {
  const database = getDb();
  const offset = (page - 1) * limit;

  let query, countQuery, params;

  // liked_by_me：只要有傳 userId 就幫他算（用 EXISTS 查，不影响其他行）
  // filterUserId：只想看某人的文章（"我的文章" 分頁用）
  // tag：依標籤搜尋
  // username：依作者帳號搜尋（頭像點擊用）
  // sort：hot → 按讚數+時間排序，new → 純時間排序
  // hybrid（sort=hot + page=1）：前 5 篇熱度，其餘時間
  const hasUserId = userId != null;
  const hasFilter = filterUserId != null;
  const hasTag = tag != null && tag.trim() !== '';
  const hasUsername = username != null && username.trim() !== '';

  const conditions = [];
  if (hasFilter) conditions.push('p.user_id = ?');
  if (hasTag) conditions.push('p.tags LIKE ?');
  if (hasUsername) conditions.push('u.username = ?');
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // liked_by_me 用 LEFT JOIN 避免多重相關子查干擾 SQLite ORDER BY 優化
  const likedByMeJoin = hasUserId
    ? `LEFT JOIN likes ul ON ul.post_id = p.id AND ul.user_id = ?`
    : '';
  const likedByMeSelect = hasUserId
    ? 'MAX(ul.user_id) as liked_by_me'
    : '0 as liked_by_me';

  // ORDER BY：用 explicit subquery 而非 alias，避免 SQLite 排序受 GROUP BY 影響
  // gravity 衰減分數：score = likes / POWER(hours_since_post + 2, gravity)
  // gravity > 1：新文衰減快，舊文不易留在熱門；gravity < 1：讚數主導，舊文長期累積
  const gravity = parseFloat(getSetting('hot_gravity', '1.5'));
  const hotScoreExpr = `(SELECT COUNT(*) FROM likes WHERE post_id = p.id) /
    POWER(MAX(1, (strftime('%s','now','utc') - strftime('%s',p.created_at)) / 3600.0) + 2, ${gravity})`;

  let orderByExpr;
  if (sort === 'hot') {
    orderByExpr = `${hotScoreExpr} DESC, p.created_at DESC`;
  } else {
    orderByExpr = 'p.created_at DESC';
  }

  query = `
    SELECT p.*, u.username, u.display_name,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           ${likedByMeSelect}
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ${likedByMeJoin}
    ${where}
    GROUP BY p.id
    ORDER BY ${orderByExpr}
    LIMIT ? OFFSET ?
  `;
  countQuery = (hasFilter || hasTag || hasUsername)
    ? `SELECT COUNT(*) as c FROM posts p JOIN users u ON p.user_id = u.id ${where}`
    : 'SELECT COUNT(*) as c FROM posts';

  const userIdParam = hasUserId ? [userId] : [];
  const filterParam = hasFilter ? [filterUserId] : [];
  const tagParam = hasTag ? [`%"${tag.trim()}%"`] : [];
  const usernameParam = hasUsername ? [username.trim()] : [];
  const countParams = [...filterParam, ...tagParam, ...usernameParam];
  params = [...userIdParam, ...filterParam, ...tagParam, ...usernameParam, limit, offset];

  const posts = database.prepare(query).all(...params);
  const total = database.prepare(countQuery).get(...countParams).c;

  return {
    posts: posts.map(normalizePost),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

function getPostById(postId, requesterId = null) {
  const database = getDb();
  const post = database.prepare(`
    SELECT p.*, u.username, u.display_name,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(requesterId || null, postId);

  if (!post) return null;

  // 留言
  const comments = database.prepare(`
    SELECT c.*, u.username, u.display_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(postId);

  return {
    ...normalizePost(post),
    comments: comments.map(normalizeComment),
  };
}

function deletePost(postId, userId, userRole = 'user', username = '') {
  const database = getDb();
  // 刪除前先清子資料（likes, comments 有 FK REFERENCES posts(id) ON DELETE RESTRICT）
  database.prepare('DELETE FROM likes WHERE post_id = ?').run(postId);
  database.prepare('DELETE FROM comments WHERE post_id = ?').run(postId);
  // admin（role）或 username='admin' 可刪除任何文章，否則只能刪自己的
  const isAdmin = userRole === 'admin' || username === 'admin';
  const condition = isAdmin
    ? 'DELETE FROM posts WHERE id = ?'
    : 'DELETE FROM posts WHERE id = ? AND user_id = ?';
  const params = isAdmin ? [postId] : [postId, userId];
  const result = database.prepare(condition).run(...params);
  return result.changes > 0;
}

// ── 按讚 ─────────────────────────────────────────────────────────

function toggleLike(postId, userId) {
  const database = getDb();
  const existing = database.prepare(
    'SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?'
  ).get(postId, userId);

  if (existing) {
    database.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
  } else {
    database.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
  }

  // 回傳新的 like_count（供 API 回應前端使用）
  const { like_count } = database.prepare(
    'SELECT COUNT(*) as like_count FROM likes WHERE post_id = ?'
  ).get(postId);
  return { action: existing ? 'unliked' : 'liked', likeCount: like_count };
}

// ── 文章留言 ─────────────────────────────────────────────────────

function createComment({ postId, userId, content }) {
  const database = getDb();
  const result = database.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(postId, userId, content);
  return result.lastInsertRowid;
}

function deleteComment(commentId, userId, userRole = 'user') {
  const database = getDb();
  // admin 可刪除任何留言，否則只能刪自己的
  const condition = userRole === 'admin'
    ? 'DELETE FROM comments WHERE id = ?'
    : 'DELETE FROM comments WHERE id = ? AND user_id = ?';
  const params = userRole === 'admin' ? [commentId] : [commentId, userId];
  const result = database.prepare(condition).run(...params);
  return result.changes > 0;
}

// ── 活動 ─────────────────────────────────────────────────────────

function createActivity({ userId, title, description, startDate, location }) {
  const database = getDb();
  const result = database.prepare(
    'INSERT INTO activities (user_id, title, description, start_date, location) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, title, description || '', startDate || null, location || '');
  return result.lastInsertRowid;
}

function getActivities({ page = 1, limit = 20, filter = 'upcoming' } = {}, nowCST) {
  const database = getDb();
  const offset = (page - 1) * limit;

  // nowCST = Node.js 傳入的 CST 時間（如 '2026-04-29T22:09:40'）
  // start_date = 使用者輸入的本地 CST 時間（無 timezone suffix）
  // 直接比 ISO 字串：SQLite 由左而右逐字元比
  // '2026-04-29T14:50' < '2026-04-29T22:09' → 正確判斷 past/upcoming
  let where, orderBy;
  if (filter === 'past') {
    where = `WHERE a.start_date IS NOT NULL AND a.start_date < ?`;
    orderBy = `a.start_date DESC`;
  } else {
    where = `WHERE a.start_date IS NULL OR a.start_date >= ?`;
    orderBy = `CASE WHEN a.start_date IS NULL THEN 1 ELSE 0 END, a.start_date ASC`;
  }

  const baseQuery = `
    SELECT a.*, u.username, u.display_name,
           (SELECT COUNT(*) FROM activity_comments WHERE activity_id = a.id) as comment_count
    FROM activities a
    JOIN users u ON a.user_id = u.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `SELECT COUNT(*) as c FROM activities a ${where}`;

  const activities = database.prepare(baseQuery).all(nowCST, limit, offset);
  const total = database.prepare(countQuery).get(nowCST).c;

  return {
    activities: activities.map(normalizeActivity),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

function getActivityById(activityId) {
  const database = getDb();
  const activity = database.prepare(`
    SELECT a.*, u.username, u.display_name,
           (SELECT COUNT(*) FROM activity_comments WHERE activity_id = a.id) as comment_count
    FROM activities a
    JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `).get(activityId);

  if (!activity) return null;

  const comments = database.prepare(`
    SELECT c.*, u.username, u.display_name
    FROM activity_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.activity_id = ?
    ORDER BY c.created_at ASC
  `).all(activityId);

  return {
    ...normalizeActivity(activity),
    comments: comments.map(normalizeActivityComment),
  };
}

function deleteActivity(activityId, userId, userRole = 'user', username = '') {
  const database = getDb();
  // 先清子留言（activity_comments 有 FK REFERENCES activities(id)）
  database.prepare('DELETE FROM activity_comments WHERE activity_id = ?').run(activityId);
  // admin 可刪除任何活動，否則只能刪自己的
  const isAdmin = userRole === 'admin' || username === 'admin';
  const condition = isAdmin
    ? 'DELETE FROM activities WHERE id = ?'
    : 'DELETE FROM activities WHERE id = ? AND user_id = ?';
  const params = isAdmin ? [activityId] : [activityId, userId];
  const result = database.prepare(condition).run(...params);
  return result.changes > 0;
}

// ── 活動留言 ─────────────────────────────────────────────────────

function createActivityComment({ activityId, userId, content }) {
  const database = getDb();
  const result = database.prepare(
    'INSERT INTO activity_comments (activity_id, user_id, content) VALUES (?, ?, ?)'
  ).run(activityId, userId, content);
  return result.lastInsertRowid;
}

function deleteActivityComment(commentId, userId, userRole = 'user', username = '') {
  const database = getDb();
  // admin 可刪除任何活動留言，否則只能刪自己的
  const isAdmin = userRole === 'admin' || username === 'admin';
  const condition = isAdmin
    ? 'DELETE FROM activity_comments WHERE id = ?'
    : 'DELETE FROM activity_comments WHERE id = ? AND user_id = ?';
  const params = isAdmin ? [commentId] : [commentId, userId];
  const result = database.prepare(condition).run(...params);
  return result.changes > 0;
}

// ── CSRF Token ───────────────────────────────────────────────────
// 使用 Unix timestamp（整數）儲存，比較時用 strftime('%s','now') 轉換

function createCsrfToken(userId) {
  const database = getDb();
  const token = require('crypto').randomBytes(32).toString('hex');
  const expiresUnix = Math.floor(Date.now() / 1000) + 3600; // 1 小時後

  database.prepare(
    'DELETE FROM csrf_tokens WHERE user_id = ? OR expires < strftime(\'%s\',\'now\')'
  ).run(userId);

  database.prepare(
    'INSERT INTO csrf_tokens (token, user_id, expires) VALUES (?, ?, ?)'
  ).run(token, userId, expiresUnix);

  return token;
}

function verifyCsrfToken(token, userId) {
  if (!token || !userId) return false;
  const database = getDb();
  const row = database.prepare(
    'SELECT 1 FROM csrf_tokens WHERE token = ? AND user_id = ? AND expires > strftime(\'%s\',\'now\')'
  ).get(token, userId);
  if (row) {
    // 驗證後刪除（一次性）
    database.prepare('DELETE FROM csrf_tokens WHERE token = ?').run(token);
    return true;
  }
  return false;
}

// ── 輔助 ─────────────────────────────────────────────────────────

/**
 * 將 SQLite datetime 字串轉成 ISO 8601 並附加 +08:00 時區
 * 這樣 JS new Date() 才能正確解析為台灣本地時間
 */
function tz(dt) {
  if (!dt) return null;
  // 已有時區後綴就直接回傳
  if (/[Z+-]\d{2}:?\d{2}$/.test(dt)) return dt;
  // 將 UTC 時間字串轉為台灣時間（UTC+8）
  // dt 格式如 "2026-04-29 00:21:05"，是 UTC 時間
  const d = new Date(dt + 'Z'); // 明確指定為 UTC
  d.setHours(d.getHours() + 8); // 轉成 UTC+8
  // 格式化為 ISO 字串（會自動帶 Z 或 +08:00）
  return d.toISOString().replace('Z', '+08:00');
}

function normalizePost(post) {
  if (!post) return null;
  return {
    id: post.id,
    userId: post.user_id,
    username: post.username,
    displayName: post.display_name,
    title: post.title,
    content: post.content,
    tags: (() => { try { return JSON.parse(post.tags || '[]'); } catch { return []; } })(),
    likeCount: post.like_count,
    likedByMe: !!post.liked_by_me,
    createdAt: tz(post.created_at),
  };
}

function normalizeComment(c) {
  return {
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    username: c.username,
    displayName: c.display_name,
    content: c.content,
    createdAt: tz(c.created_at),
  };
}

function normalizeActivity(a) {
  return {
    id: a.id,
    userId: a.user_id,
    username: a.username,
    displayName: a.display_name,
    title: a.title,
    description: a.description,
    startDate: a.start_date || null,  // 用戶輸入的本地時間，存入即輸出，不做時區轉換
    location: a.location,
    commentCount: a.comment_count,
    createdAt: tz(a.created_at),
  };
}

function normalizeActivityComment(c) {
  return {
    id: c.id,
    activityId: c.activity_id,
    userId: c.user_id,
    username: c.username,
    displayName: c.display_name,
    content: c.content,
    createdAt: tz(c.created_at),
  };
}

// ── 言論禁止 ─────────────────────────────────────────────────

function getBlockedWords() {
  const database = getDb();
  return database.prepare('SELECT * FROM blocked_words ORDER BY id DESC').all();
}

function addBlockedWord(word) {
  const database = getDb();
  try {
    const result = database.prepare('INSERT INTO blocked_words (word) VALUES (?)').run(word.trim());
    return result.lastInsertRowid;
  } catch (err) {
    if (err.message.includes('UNIQUE')) return null; // 已存在
    throw err;
  }
}

function removeBlockedWord(id) {
  const database = getDb();
  const result = database.prepare('DELETE FROM blocked_words WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── 系統設定 ──────────────────────────────────────────────────

function getSetting(key, defaultValue = null) {
  const database = getDb();
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  const database = getDb();
  database.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

/**
 * 檢查文字是否包含禁止言論
 * 回傳被禁止的字詞列表（空陣列 = 全部允許）
 */
function checkBlockedContent(text) {
  if (!text) return [];
  const words = getBlockedWords();
  const blocked = [];
  const lower = text.toLowerCase();
  for (const { word } of words) {
    if (lower.includes(word.toLowerCase())) {
      blocked.push(word);
    }
  }
  return blocked;
}

/**
 * 從內容中解析 #tag1#tag2 格式的標籤
 * 回傳 ['tag1', 'tag2']
 */
function parseTags(content) {
  if (!content) return [];
  const matches = content.match(/#([^\s#]+)/g);
  if (!matches) return [];
  // 去 # 前綴並去除空白，取唯一值
  return [...new Set(matches.map(m => m.slice(1).trim()).filter(t => t.length > 0))];
}

module.exports = {
  tz,
  initDb,
  createUser,
  getUserByUsername,
  getUserById,
  verifyPassword,
  getUserStats,
  createPost,
  getPosts,
  getPostById,
  deletePost,
  toggleLike,
  createComment,
  deleteComment,
  createActivity,
  getActivities,
  getActivityById,
  deleteActivity,
  createActivityComment,
  deleteActivityComment,
  createCsrfToken,
  verifyCsrfToken,
  getBlockedWords,
  addBlockedWord,
  removeBlockedWord,
  checkBlockedContent,
  getSetting,
  setSetting,
};
