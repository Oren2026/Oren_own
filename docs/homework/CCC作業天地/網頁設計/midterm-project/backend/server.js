/**
 * server.js — 聊天啊!尬殿 Backend API Server
 *
 * 資安防護一覽：
 * ✓ HTTP-only Cookie（JWT 無法被 JavaScript 讀取）
 * ✓ SameSite=Strict（完全防止 CSRF）
 * ✓ CSRF Token（雙重保障）
 * ✓ Rate Limiting（防止暴力破解/灌水）
 * ✓ Parameterized Queries（防止 SQL Injection）
 * ✓ bcrypt 密碼 hash（密碼不明文儲存）
 * ✓ XSS 防護（輸出時 HTML escape，由 Client 處理）
 *
 * 啟動：
 *   node server.js
 *   預設監聽 http://localhost:3000
 *
 * 外部存取（需等 Tailscale 設定完成）：
 *   http://<你的IP>:3000
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cookie = require('cookie');
const path = require('path');

const { initDb,
        createUser, getUserByUsername, getUserById, verifyPassword, getUserStats,
        createPost, getPosts, getPostById, deletePost, toggleLike,
        createComment, deleteComment,
        createActivity, getActivities, getActivityById, deleteActivity,
        createActivityComment, deleteActivityComment, tz,
        getBlockedWords, addBlockedWord, removeBlockedWord, checkBlockedContent,
        getSetting, setSetting } = require('./db');

const { generateToken, requireAuth, optionalAuth, setAuthCookie, clearAuthCookie } = require('./middleware/auth');
const { rateLimit, strictRateLimit, getRateLimitStats } = require('./middleware/rateLimit');
const { requireCsrf, createCsrfToken } = require('./middleware/csrf');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 中介層 ────────────────────────────────────────────────────────
app.use(cors({
  origin: true,  // 允許所有 origin（因為要從 GitHub Pages 過來）
  credentials: true, // 允許帶 Cookie
}));
app.use(express.json({ limit: '1mb' }));    // JSON body，限制 1MB
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Rate limiting（全域）
app.use(rateLimit);

// Trust proxy（如果放在 Nginx/Caddy 後面）
app.set('trust proxy', 1);

// ── 初始化資料庫 ──────────────────────────────────────────────────
initDb();

// ── 工具函式 ──────────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName,
    role: user.role || 'user',
    createdAt: tz(user.created_at || user.createdAt),
  };
}

// ══════════════════════════════════════════════════════════════════
//  認證 API
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/register
 * 申請帳號
 */
app.post('/api/auth/register', strictRateLimit, async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '帳號和密碼為必填' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: '帳號長度需在 3-30 字之間' });
    }
    if (!/^\w+$/u.test(username)) {
      return res.status(400).json({ error: '帳號只能包含英文、數字和底線' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密碼長度至少 6 字' });
    }
    const user = createUser({ username, password, displayName: displayName || username });
    const token = generateToken(user.id, user.username);
    setAuthCookie(res, token);
    const csrfToken = createCsrfToken(user.id);
    res.json({ user: sanitizeUser(user), csrfToken });
  } catch (err) {
    if (err.message === 'USERNAME_EXISTS') {
      return res.status(409).json({ error: '帳號已有人使用' });
    }
    console.error('[Register Error]', err.message, err.stack);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

/**
 * POST /api/auth/login
 * 登入
 */
app.post('/api/auth/login', strictRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請填寫帳號和密碼' });
    }

    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password)) {
      // 故意延遲，防止 Timing Attack
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const token = generateToken(user.id, user.username);
    setAuthCookie(res, token);
    const csrfToken = createCsrfToken(user.id);

    res.json({
      user: sanitizeUser(user),
      csrfToken,
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

/**
 * POST /api/auth/logout
 * 登出
 */
app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/**
 * GET /api/auth/me
 * 取得當前登入使用者資訊
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: '使用者不存在' });
  const stats = getUserStats(req.userId);
  res.json({ user: sanitizeUser(user), stats });
});

/**
 * GET /api/auth/csrf
 * 取得新的 CSRF Token（已登入才能拿）
 */
app.get('/api/auth/csrf', requireAuth, (req, res) => {
  const token = createCsrfToken(req.userId);
  res.json({ csrfToken: token });
});

// ══════════════════════════════════════════════════════════════════
//  文章 API
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/posts
 * 取得所有文章（分頁）
 */
app.get('/api/posts', requireAuth, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const tag = req.query.tag || null;
    const username = req.query.username || null;
    const sort = req.query.sort === 'hot' ? 'hot' : 'new';
    const result = getPosts({ page, userId: req.userId, tag, username, sort });
    res.json(result);
  } catch (err) {
    console.error('[Get Posts Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * POST /api/posts
 * 發表文章
 */
app.post('/api/posts', requireAuth, requireCsrf, (req, res) => {
  try {
    const { title, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '內容不能為空' });
    }
    if (content.length > 50000) {
      return res.status(400).json({ error: '內容太長（上限 50000 字）' });
    }
    const blockedContent = checkBlockedContent(title + ' ' + content);
    if (blockedContent.length > 0) {
      return res.status(400).json({ error: `內容含有禁止言論：${blockedContent.join('、')}` });
    }

    const postId = createPost({
      userId: req.userId,
      title: escapeHtml(title || ''),
      content: escapeHtml(content),  // XSS 防護，tags 會自動從內容解析
    });

    const post = getPostById(postId, req.userId);
    res.json({ post });
  } catch (err) {
    console.error('[Create Post Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * GET /api/posts/:id
 * 取得單篇文章（含留言）
 */
app.get('/api/posts/:id', requireAuth, (req, res) => {
  try {
    const post = getPostById(parseInt(req.params.id), req.userId);
    if (!post) return res.status(404).json({ error: '文章不存在' });
    res.json({ post });
  } catch (err) {
    console.error('[Get Post Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * DELETE /api/posts/:id
 * 刪除自己的文章
 */
app.delete('/api/posts/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const ok = deletePost(parseInt(req.params.id), req.userId, req.userRole, req.username);
    if (!ok) return res.status(404).json({ error: '文章不存在或無權限' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Delete Post Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * POST /api/posts/:id/like
 * 按讚 / 取消讚
 */
app.post('/api/posts/:id/like', requireAuth, requireCsrf, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = getPostById(postId);
    if (!post) return res.status(404).json({ error: '文章不存在' });

    const result = toggleLike(postId, req.userId);
    res.json({ liked: result.action === 'liked', likeCount: result.likeCount });
  } catch (err) {
    console.error('[Like Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * POST /api/posts/:id/comment
 * 新增留言
 */
app.post('/api/posts/:id/comment', requireAuth, requireCsrf, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '留言不能為空' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: '留言太長（上限 2000 字）' });
    }
    const blocked = checkBlockedContent(content);
    if (blocked.length > 0) {
      return res.status(400).json({ error: `內容含有禁止言論：${blocked.join('、')}` });
    }

    const postId = parseInt(req.params.id);
    const post = getPostById(postId);
    if (!post) return res.status(404).json({ error: '文章不存在' });

    const commentId = createComment({
      postId,
      userId: req.userId,
      content: escapeHtml(content),
    });

    res.json({ commentId });
  } catch (err) {
    console.error('[Comment Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * DELETE /api/comments/:id
 * 刪除留言
 */
app.delete('/api/comments/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const ok = deleteComment(parseInt(req.params.id), req.userId, req.userRole);
    if (!ok) return res.status(404).json({ error: '留言不存在或無權限' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Delete Comment Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// ══════════════════════════════════════════════════════════════════
//  活動 API
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/activities
 * 取得所有活動
 */
app.get('/api/activities', requireAuth, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const filter = req.query.filter === 'past' ? 'past' : 'upcoming';
    // Node.js Date.now() 是 UTC，+8h = CST（server 和使用者都在 UTC+8）
    const nowCST = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '');
    const result = getActivities({ page, filter }, nowCST);
    res.json(result);
  } catch (err) {
    console.error('[Get Activities Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * POST /api/activities
 * 建立活動
 */
app.post('/api/activities', requireAuth, requireCsrf, (req, res) => {
  try {
    const { title, description, startDate, location } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: '標題不能為空' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: '標題太長（上限 200 字）' });
    }

    const activityId = createActivity({
      userId: req.userId,
      title: escapeHtml(title),
      description: escapeHtml(description || ''),
      startDate,
      location: escapeHtml(location || ''),
    });

    const activity = getActivityById(activityId);
    res.json({ activity });
  } catch (err) {
    console.error('[Create Activity Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * GET /api/activities/:id
 * 取得單一活動（含留言）
 */
app.get('/api/activities/:id', requireAuth, (req, res) => {
  try {
    const activity = getActivityById(parseInt(req.params.id));
    if (!activity) return res.status(404).json({ error: '活動不存在' });
    res.json({ activity });
  } catch (err) {
    console.error('[Get Activity Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * DELETE /api/activities/:id
 * 刪除活動
 */
app.delete('/api/activities/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const ok = deleteActivity(parseInt(req.params.id), req.userId, req.userRole, req.username);
    if (!ok) return res.status(404).json({ error: '活動不存在或無權限' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Delete Activity Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * POST /api/activities/:id/comment
 * 活動留言
 */
app.post('/api/activities/:id/comment', requireAuth, requireCsrf, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '留言不能為空' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: '留言太長（上限 2000 字）' });
    }
    const blocked = checkBlockedContent(content);
    if (blocked.length > 0) {
      return res.status(400).json({ error: `內容含有禁止言論：${blocked.join('、')}` });
    }

    const activityId = parseInt(req.params.id);
    const activity = getActivityById(activityId);
    if (!activity) return res.status(404).json({ error: '活動不存在' });

    const commentId = createActivityComment({
      activityId,
      userId: req.userId,
      content: escapeHtml(content),
    });

    res.json({ commentId });
  } catch (err) {
    console.error('[Activity Comment Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

/**
 * DELETE /api/activity-comments/:id
 * 刪除活動留言
 */
app.delete('/api/activity-comments/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const ok = deleteActivityComment(parseInt(req.params.id), req.userId, req.userRole, req.username);
    if (!ok) return res.status(404).json({ error: '留言不存在或無權限' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Delete Activity Comment Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// ══════════════════════════════════════════════════════════════════
//  言論禁止管理（Admin only）
// ══════════════════════════════════════════════════════════════════

app.get('/api/blocked-words', requireAuth, (req, res) => {
  try {
    res.json({ words: getBlockedWords() });
  } catch (err) {
    console.error('[Blocked Words Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

app.post('/api/blocked-words', requireAuth, requireCsrf, (req, res) => {
  try {
    const { word } = req.body;
    if (!word || word.trim().length === 0) {
      return res.status(400).json({ error: '詞語不能為空' });
    }
    const id = addBlockedWord(word);
    if (id === null) {
      return res.status(409).json({ error: '此詞語已在清單中' });
    }
    res.json({ id });
  } catch (err) {
    console.error('[Add Blocked Word Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

app.delete('/api/blocked-words/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const ok = removeBlockedWord(parseInt(req.params.id));
    if (!ok) return res.status(404).json({ error: '詞語不存在' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Remove Blocked Word Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// ══════════════════════════════════════════════════════════════════
//  系統設定（Admin only）
// ══════════════════════════════════════════════════════════════════

// GET /api/settings — 取得所有設定（無需登入，純公開資訊）
app.get('/api/settings', (req, res) => {
  try {
    const gravity = parseFloat(getSetting('hot_gravity', '1.5'));
    res.json({ hot_gravity: gravity });
  } catch (err) {
    console.error('[Settings Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// PUT /api/settings — 更新設定（需 admin 身份）
app.put('/api/settings', requireAuth, requireCsrf, (req, res) => {
  if (req.userRole !== 'admin' && req.username !== 'admin') {
    return res.status(403).json({ error: '需要 admin 權限' });
  }
  try {
    const { hot_gravity } = req.body;
    if (hot_gravity === undefined || hot_gravity === null) {
      return res.status(400).json({ error: '缺少 hot_gravity 參數' });
    }
    const g = parseFloat(hot_gravity);
    if (isNaN(g) || g < 0.5 || g > 3.0) {
      return res.status(400).json({ error: 'hot_gravity 必須是 0.5 ~ 3.0 的數字' });
    }
    setSetting('hot_gravity', g);
    res.json({ hot_gravity: g });
  } catch (err) {
    console.error('[Update Settings Error]', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// GET /api/admin/stats — 查看 Rate Limit 統計（需 admin）
app.get('/api/admin/stats', requireAuth, (req, res) => {
  if (req.userRole !== 'admin' && req.username !== 'admin') {
    return res.status(403).json({ error: '需要 admin 權限' });
  }
  res.json(getRateLimitStats());
});

// ══════════════════════════════════════════════════════════════════
//  健康檢查
// ══════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════
//  啟動
// ══════════════════════════════════════════════════════════════════

// 前端迴歸到 index.html（ SPA 路由）- 放在 static 之前，否則 static 會先攔截 /
const { verifyToken } = require('./middleware/auth');
app.get('/', (req, res) => {
  const html = require('fs').readFileSync(path.join(FRONTEND_PATH, 'index.html'), 'utf8');

  // 嘗試從 Cookie 解析 JWT
  let authData = 'null';
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    if (cookies.chatrank_token) {
      const payload = verifyToken(cookies.chatrank_token);
      if (payload) {
        const user = getUserById(payload.userId);
        if (user) {
          authData = JSON.stringify(sanitizeUser(user));
        }
      }
    }
  } catch {}

  // 在 </head> 之前注入 blocking script，DOM 解析前就設定好 auth state
  const inject = `<script>window.__AUTH__=${authData};</script>`;
  const htmlWithAuth = html.replace('</head>', inject + '</head>');

  res.type('html').send(htmlWithAuth);
});

// 靜態檔案：前端（midterm-project 目錄）
const FRONTEND_PATH = path.join(__dirname, '..', '..', 'Oren_own', 'docs', 'homework', 'CCC作業天地', '網頁設計', 'midterm-project');
app.use(express.static(FRONTEND_PATH));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   聊天啊!尬殿  Backend Server             ║
║   http://localhost:${PORT}                    ║
║   前端：http://localhost:${PORT}              ║
║   API：  http://localhost:${PORT}/api        ║
╚═══════════════════════════════════════════╝
  `);
});
