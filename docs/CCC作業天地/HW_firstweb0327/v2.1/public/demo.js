/**
 * public/demo.js — 試用模式（Demo Mode）
 *
 * 用途：讓 public/index.html 可以脫離 Node.js server 獨立演示
 * 使用方式：在 index.html 中載入此腳本即可開啟試用模式
 *
 * 原理：覆蓋 window.fetch，攔截 /api/* 呼叫並回傳 mock JSON 資料
 *       登入功能使用 localStorage 模擬 session
 */

'use strict';

/* ============================================================
   設定
   ============================================================ */
const DEMO_USER = { id: 1, username: 'admin' }; // 預設登入身份
let demoUser = null;                             // null = 未登入

/* ============================================================
   Mock 用戶資料
   ============================================================ */
const MOCK_USERS = [
  { id: 1, username: 'admin',  password_hash: '1234' },
  { id: 2, username: '小美',    password_hash: '1111' },
  { id: 3, username: '阿偉',    password_hash: '2222' },
  { id: 4, username: '妮妮',    password_hash: '3334' },
];

/* ============================================================
   工具
   ============================================================ */
const mockFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // ── 統一的假延遲（模擬網路）──────────────────────────────
  await new Promise(r => setTimeout(r, 80 + Math.random() * 120));

  // ── GET /api/auth/me ────────────────────────────────────
  if (method === 'GET' && url === '/api/auth/me') {
    if (!demoUser) {
      return makeResponse({ error: '請先登入' }, 401);
    }
    return makeResponse({ user: demoUser });
  }

  // ── POST /api/auth/login ────────────────────────────────
  if (method === 'POST' && url === '/api/auth/login') {
    const user = MOCK_USERS.find(
      u => u.username === body.username && u.password_hash === body.password
    );
    if (!user) return makeResponse({ error: '帳號或密碼錯誤' }, 401);
    demoUser = { id: user.id, username: user.username };
    return makeResponse({ ok: true, user: demoUser });
  }

  // ── POST /api/auth/register ─────────────────────────────
  if (method === 'POST' && url === '/api/auth/register') {
    if (!body.username || !body.password)
      return makeResponse({ error: '請填寫帳號和密碼' }, 400);
    if (body.username.trim().length < 2)
      return makeResponse({ error: '帳號至少要 2 個字元' }, 400);
    if (body.password.length < 4)
      return makeResponse({ error: '密碼至少要 4 個字元' }, 400);
    if (MOCK_USERS.find(u => u.username === body.username.trim()))
      return makeResponse({ error: '帳號已有人使用' }, 409);
    const newUser = { id: MOCK_USERS.length + 1, username: body.username.trim() };
    MOCK_USERS.push({ ...newUser, password_hash: body.password });
    demoUser = newUser;
    return makeResponse({ ok: true, user: newUser }, 201);
  }

  // ── POST /api/auth/logout ──────────────────────────────
  if (method === 'POST' && url === '/api/auth/logout') {
    demoUser = null;
    return makeResponse({ ok: true });
  }

  // ── GET /api/entries ────────────────────────────────────
  if (method === 'GET' && url.startsWith('/api/entries')) {
    // 取得靜態 mock JSON
    let allEntries = window._mockEntries || [];

    // 解析 query params
    const params = new URLSearchParams(url.split('?')[1] || '');
    const author = params.get('author');
    const q      = params.get('q');
    const tag    = params.get('tag');
    const page   = parseInt(params.get('page') || '1', 10);
    const limit  = parseInt(params.get('limit') || '10', 10);

    // 過濾
    if (author) allEntries = allEntries.filter(e => e.username === author);
    if (q)      allEntries = allEntries.filter(e =>
      e.title.includes(q) || (e.content && e.content.includes(q))
    );
    if (tag)    allEntries = allEntries.filter(e =>
      e.tags && e.tags.split(',').map(t => t.trim()).includes(tag)
    );

    // 分頁
    const total     = allEntries.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage   = Math.min(Math.max(1, page), totalPages);
    const start      = (safePage - 1) * limit;
    const entries    = allEntries.slice(start, start + limit);

    return makeResponse({ entries, total, page: safePage, limit, totalPages });
  }

  // ── POST /api/entries ───────────────────────────────────
  if (method === 'POST' && url === '/api/entries') {
    if (!demoUser) return makeResponse({ error: '請先登入' }, 401);
    if (!body.title || !body.title.trim())
      return makeResponse({ error: '請填寫標題' }, 400);

    const newEntry = {
      id: Date.now(),
      user_id: demoUser.id,
      username: demoUser.username,
      title: body.title.trim(),
      content: body.content || '',
      date: body.date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tags: body.tags || '',
    };

    if (!window._mockEntries) window._mockEntries = [];
    window._mockEntries.unshift(newEntry);
    return makeResponse({ ok: true, entry: newEntry }, 201);
  }

  // ── PUT /api/entries/:id ─────────────────────────────────
  if (method === 'PUT' && url.match(/^\/api\/entries\/\d+$/)) {
    if (!demoUser) return makeResponse({ error: '請先登入' }, 401);
    const id = parseInt(url.split('/').pop(), 10);
    const idx = (window._mockEntries || []).findIndex(e => e.id === id);
    if (idx === -1) return makeResponse({ error: '文章不存在' }, 404);

    const entry = window._mockEntries[idx];
    if (entry.user_id !== demoUser.id)
      return makeResponse({ error: '沒有權限編輯這篇文章' }, 403);

    window._mockEntries[idx] = {
      ...entry,
      title: body.title.trim(),
      content: body.content || '',
      date: body.date || entry.date,
      tags: body.tags || entry.tags || '',
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    return makeResponse({ ok: true, entry: window._mockEntries[idx] });
  }

  // ── DELETE /api/entries/:id ────────────────────────────
  if (method === 'DELETE' && url.match(/^\/api\/entries\/\d+$/)) {
    if (!demoUser) return makeResponse({ error: '請先登入' }, 401);
    const id = parseInt(url.split('/').pop(), 10);
    const idx = (window._mockEntries || []).findIndex(e => e.id === id);
    if (idx === -1) return makeResponse({ error: '文章不存在' }, 404);
    if (window._mockEntries[idx].user_id !== demoUser.id)
      return makeResponse({ error: '沒有權限刪除這篇文章' }, 403);
    window._mockEntries.splice(idx, 1);
    return makeResponse({}, 204);
  }

  // ── GET /api/health ─────────────────────────────────────
  if (url === '/api/health') {
    return makeResponse({ status: 'ok', time: new Date().toISOString() });
  }

  // 未知的 API → 404
  return makeResponse({ error: 'API 路由不存在' }, 404);
};

/* 輔助：構造 Response 物件 */
function makeResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* ============================================================
   初始化
   ============================================================ */
async function initDemo() {
  // 先 fetch 靜態 mock JSON
  try {
    const res = await window.fetch('mock-data.json');
    const data = await res.json();
    window._mockEntries = data.entries || [];
  } catch (e) {
    console.warn('[Demo] 無法載入 mock-data.json：', e);
    window._mockEntries = [];
  }

  // 覆蓋 window.fetch
  window.fetch = mockFetch;

  // 顯示試用模式提示
  showDemoBanner();
  console.log('[Demo Mode] 已啟動，fetch 已被攔截。輸入任意帳號密碼即可登入。');
}

/* 顯示 banner */
function showDemoBanner() {
  const banner = document.createElement('div');
  banner.id = 'demo-banner';
  banner.style.cssText = [
    'background:#dcfce7',
    'border-bottom:2px solid #16a34a',
    'padding:0.6rem 1rem',
    'text-align:center',
    'font-size:0.82rem',
    'color:#166534',
    'font-weight:600',
    'position:fixed',
    'bottom:0',
    'left:0',
    'right:0',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'gap:1rem',
  ].join(';');

  banner.innerHTML = `
    <span>🌿 <strong>試用模式</strong> — 脫離 server 獨立演示</span>
    <span style="font-weight:400;font-size:0.78rem;">可用任意帳號密碼登入｜<code>admin / 1234</code></span>
    <button onclick="this.parentElement.remove()" style="
      background:#16a34a;color:white;border:none;padding:0.2rem 0.6rem;
      border-radius:6px;cursor:pointer;font-size:0.78rem;
    ">✕ 關閉</button>
  `;
  document.body.appendChild(banner);
}

/* 啟動 */
initDemo();
