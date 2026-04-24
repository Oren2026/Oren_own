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
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── 按讚 ────────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      user_id  INTEGER NOT NULL REFERENCES users(id),
      post_id  INTEGER NOT NULL REFERENCES posts(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── 活動留言 ────────────────────────────────────────────────
  database.exec(`
    CREATE TABLE IF NOT EXISTS activity_comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      content     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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
  return database.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(id);
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

function createPost({ userId, title, content, tags }) {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO posts (user_id, title, content, tags) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(userId, title, content, JSON.stringify(tags || []));
  return result.lastInsertRowid;
}

function getPosts({ page = 1, limit = 20, userId = null } = {}) {
  const database = getDb();
  const offset = (page - 1) * limit;

  let query, countQuery, params;

  if (userId) {
    query = `
      SELECT p.*, u.username, u.display_name,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    countQuery = 'SELECT COUNT(*) as c FROM posts WHERE user_id = ?';
    params = [userId, userId, limit, offset];
  } else {
    query = `
      SELECT p.*, u.username, u.display_name,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
             0 as liked_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    countQuery = 'SELECT COUNT(*) as c FROM posts';
    params = [limit, offset];
  }

  const posts = database.prepare(query).all(...params);
  const total = database.prepare(countQuery).get(...(userId ? [userId] : [])).c;

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

function deletePost(postId, userId) {
  const database = getDb();
  const result = database.prepare(
    'DELETE FROM posts WHERE id = ? AND user_id = ?'
  ).run(postId, userId);
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
    return 'unliked';
  } else {
    database.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
    return 'liked';
  }
}

// ── 文章留言 ─────────────────────────────────────────────────────

function createComment({ postId, userId, content }) {
  const database = getDb();
  const result = database.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(postId, userId, content);
  return result.lastInsertRowid;
}

function deleteComment(commentId, userId) {
  const database = getDb();
  const result = database.prepare(
    'DELETE FROM comments WHERE id = ? AND user_id = ?'
  ).run(commentId, userId);
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

function getActivities({ page = 1, limit = 20 } = {}) {
  const database = getDb();
  const offset = (page - 1) * limit;

  const activities = database.prepare(`
    SELECT a.*, u.username, u.display_name,
           (SELECT COUNT(*) FROM activity_comments WHERE activity_id = a.id) as comment_count
    FROM activities a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = database.prepare('SELECT COUNT(*) as c FROM activities').get().c;

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

function deleteActivity(activityId, userId) {
  const database = getDb();
  const result = database.prepare(
    'DELETE FROM activities WHERE id = ? AND user_id = ?'
  ).run(activityId, userId);
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

function deleteActivityComment(commentId, userId) {
  const database = getDb();
  const result = database.prepare(
    'DELETE FROM activity_comments WHERE id = ? AND user_id = ?'
  ).run(commentId, userId);
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
    createdAt: post.created_at,
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
    createdAt: c.created_at,
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
    startDate: a.start_date,
    location: a.location,
    commentCount: a.comment_count,
    createdAt: a.created_at,
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
    createdAt: c.created_at,
  };
}

module.exports = {
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
};
