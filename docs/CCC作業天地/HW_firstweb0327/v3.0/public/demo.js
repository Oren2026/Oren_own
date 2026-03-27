/**
 * public/demo.js — v3.0 試用模式
 *
 * v3.0 新增支援：
 * - GET /api/users/:username          個人檔案（含粉絲/追蹤數）
 * - PUT /api/users/me                 更新個人設定
 * - POST/DELETE /api/users/:username/follow  追蹤/取消追蹤
 * - GET /api/users/:username/entries   個人文章列表
 */
'use strict';

let mockUsers = [];
let mockEntries = [];
let mockFollows = [];
let demoUser = null; // { id, username }

async function initDemo() {
  try {
    const res = await fetch('mock-data.json');
    const data = await res.json();
    mockUsers   = data.users   || [];
    mockEntries  = data.entries  || [];
    mockFollows = data.follows || [];
  } catch (e) {
    mockUsers = []; mockEntries = []; mockFollows = [];
  }
  window.fetch = mockFetch;
  showDemoBanner();
  console.log('[Demo v3.0] 已啟動。輸入任意帳號密碼即可登入。');
}

async function mockFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body   = options.body ? JSON.parse(options.body) : {};

  await new Promise(r => setTimeout(r, 60 + Math.random() * 80));

  // ── auth ──────────────────────────────────────────────
  if (method === 'GET' && url === '/api/auth/me') {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    return mockResp({ user: demoUser });
  }
  if (method === 'POST' && url === '/api/auth/login') {
    const u = mockUsers.find(x => x.username === body.username);
    if (!u) return mockResp({ error: '帳號或密碼錯誤' }, 401);
    demoUser = { id: u.id, username: u.username, bio: u.bio, avatar_color: u.avatar_color, background: u.background };
    return mockResp({ ok: true, user: demoUser });
  }
  if (method === 'POST' && url === '/api/auth/register') {
    if (!body.username || !body.password) return mockResp({ error: '請填寫帳號和密碼' }, 400);
    if (mockUsers.find(x => x.username === body.username.trim())) return mockResp({ error: '帳號已有人使用' }, 409);
    const newU = { id: mockUsers.length + 1, username: body.username.trim(), bio: '', avatar_color: '#0f766e', background: '' };
    mockUsers.push(newU);
    demoUser = newU;
    return mockResp({ ok: true, user: demoUser }, 201);
  }
  if (method === 'POST' && url === '/api/auth/logout') {
    demoUser = null;
    return mockResp({ ok: true });
  }

  // ── entries ────────────────────────────────────────────
  if (method === 'GET' && url.startsWith('/api/entries')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const author = params.get('author');
    const q      = params.get('q');
    const tag    = params.get('tag');
    const page   = parseInt(params.get('page') || '1', 10);
    const limit  = parseInt(params.get('limit') || '10', 10);
    let rows = [...mockEntries];
    if (author) rows = rows.filter(e => e.username === author);
    if (q)      rows = rows.filter(e => e.title.includes(q) || (e.content && e.content.includes(q)));
    if (tag)    rows = rows.filter(e => e.tags && e.tags.split(',').map(t => t.trim()).includes(tag));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (Math.min(page, totalPages) - 1) * limit;
    return mockResp({ entries: rows.slice(start, start + limit), total, page: Math.min(page, totalPages), limit, totalPages });
  }
  if (method === 'POST' && url === '/api/entries') {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    const newE = {
      id: Date.now(), user_id: demoUser.id, username: demoUser.username,
      avatar_color: demoUser.avatar_color,
      title: body.title.trim(), content: body.content || '',
      date: body.date || new Date().toISOString().slice(0,10),
      tags: body.tags || '',
      created_at: new Date().toISOString().replace('T',' ').slice(0,19),
      updated_at: new Date().toISOString().replace('T',' ').slice(0,19),
    };
    mockEntries.unshift(newE);
    return mockResp({ ok: true, entry: newE }, 201);
  }
  if (method === 'PUT' && url.match(/^\/api\/entries\/\d+$/)) {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    const id = parseInt(url.split('/').pop(), 10);
    const idx = mockEntries.findIndex(e => e.id === id);
    if (idx === -1) return mockResp({ error: '文章不存在' }, 404);
    if (mockEntries[idx].user_id !== demoUser.id) return mockResp({ error: '沒有權限' }, 403);
    mockEntries[idx] = { ...mockEntries[idx], title: body.title.trim(), content: body.content || '', tags: body.tags || '', date: body.date || mockEntries[idx].date, updated_at: new Date().toISOString().replace('T',' ').slice(0,19) };
    return mockResp({ ok: true, entry: mockEntries[idx] });
  }
  if (method === 'DELETE' && url.match(/^\/api\/entries\/\d+$/)) {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    const id = parseInt(url.split('/').pop(), 10);
    const idx = mockEntries.findIndex(e => e.id === id);
    if (idx === -1) return mockResp({ error: '文章不存在' }, 404);
    if (mockEntries[idx].user_id !== demoUser.id) return mockResp({ error: '沒有權限' }, 403);
    mockEntries.splice(idx, 1);
    return mockResp({}, 204);
  }

  // ── users ──────────────────────────────────────────────
  if (method === 'GET' && url.startsWith('/api/users/') && url.match(/\/users\/[^/]+\/entries$/)) {
    const username = url.split('/')[3];
    const params   = new URLSearchParams(url.split('?')[1] || '');
    const q = params.get('q');
    const u = mockUsers.find(x => x.username === decodeURIComponent(username));
    if (!u) return mockResp({ error: '找不到這個使用者' }, 404);
    let rows = mockEntries.filter(e => e.user_id === u.id);
    if (q) rows = rows.filter(e => e.title.includes(q) || (e.content && e.content.includes(q)));
    return mockResp({ entries: rows });
  }
  if (method === 'GET' && url.startsWith('/api/users/')) {
    const username = decodeURIComponent(url.split('/users/')[1].split('?')[0]);
    const u = mockUsers.find(x => x.username === username);
    if (!u) return mockResp({ error: '找不到這個使用者' }, 404);
    const followers = mockFollows.filter(f => f.following_id === u.id).length;
    const following = mockFollows.filter(f => f.follower_id   === u.id).length;
    const isFollowing = demoUser ? !!mockFollows.find(f => f.follower_id === demoUser.id && f.following_id === u.id) : false;
    return mockResp({ user: { ...u, followers_count: followers, following_count: following, isFollowing, isMe: demoUser ? demoUser.id === u.id : false } });
  }
  if (method === 'PUT' && url === '/api/users/me') {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    const idx = mockUsers.findIndex(x => x.id === demoUser.id);
    if (idx !== -1) {
      mockUsers[idx] = { ...mockUsers[idx], bio: String(body.bio || '').slice(0,200), avatar_color: String(body.avatar_color || '#0f766e'), background: String(body.background || '').slice(0,300) };
      demoUser = { ...demoUser, bio: mockUsers[idx].bio, avatar_color: mockUsers[idx].avatar_color, background: mockUsers[idx].background };
    }
    return mockResp({ ok: true, user: demoUser });
  }
  if (method === 'POST' && url.match(/^\/api\/users\/[^/]+\/follow$/)) {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    const username = url.split('/users/')[1].split('/follow')[0];
    const target  = mockUsers.find(x => x.username === decodeURIComponent(username));
    if (!target) return mockResp({ error: '找不到這個使用者' }, 404);
    if (target.id === demoUser.id) return mockResp({ error: '不能追蹤自己' }, 400);
    if (mockFollows.find(f => f.follower_id === demoUser.id && f.following_id === target.id)) return mockResp({ error: '已經追蹤過了' }, 409);
    mockFollows.push({ follower_id: demoUser.id, following_id: target.id });
    return mockResp({ ok: true }, 201);
  }
  if (method === 'DELETE' && url.match(/^\/api\/users\/[^/]+\/follow$/)) {
    if (!demoUser) return mockResp({ error: '請先登入' }, 401);
    const username = url.split('/users/')[1].split('/follow')[0];
    const target  = mockUsers.find(x => x.username === decodeURIComponent(username));
    if (!target) return mockResp({ error: '找不到這個使用者' }, 404);
    const before = mockFollows.length;
    mockFollows = mockFollows.filter(f => !(f.follower_id === demoUser.id && f.following_id === target.id));
    if (mockFollows.length === before) return mockResp({ error: '本來就沒有追蹤' }, 400);
    return mockResp({}, 204);
  }
  if (url === '/api/health') return mockResp({ status: 'ok', time: new Date().toISOString() });

  return mockResp({ error: 'API 路由不存在' }, 404);
}

function mockResp(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function showDemoBanner() {
  const b = document.createElement('div');
  b.id = 'demo-banner';
  b.style.cssText = 'background:#dcfce7;border-bottom:2px solid #16a34a;padding:0.5rem 1rem;text-align:center;font-size:0.82rem;color:#166534;position:fixed;bottom:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:1rem;';
  b.innerHTML = `<span>🌿 <strong>試用模式 v3.0</strong> — 可用任意帳號密碼登入（admin/1234）</span><button onclick="this.parentElement.remove()" style="background:#16a34a;color:white;border:none;padding:0.2rem 0.6rem;border-radius:6px;cursor:pointer;font-size:0.78rem;">✕</button>`;
  document.body.appendChild(b);
}

initDemo();
