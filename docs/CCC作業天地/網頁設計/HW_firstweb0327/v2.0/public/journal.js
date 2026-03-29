/**
 * public/journal.js — v2.0 Node.js 版前端
 *
 * 與 v1.x 的差異：
 * - 拿掉 sql.js（不再在瀏覽器跑 SQLite）
 * - 拿掉 IndexedDB（資料庫在 server 端）
 * - 拿掉 SHA-256（密碼 hash 在 server 端用 bcrypt）
 * - 所有資料操作改為 fetch('/api/...') 發到 Node.js 後端
 * - JWT token 存在 localStorage，自動帶在 cookie 裡
 */

'use strict';

/* ============================================================
   全域狀態
   ============================================================ */
let currentUser = null;   // { id, username }
let filterAuthor = null;  // null = 顯示全部

/* ============================================================
   API 工具
   ============================================================ */
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',  // 讓瀏覽器自動帶上 cookie
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API 錯誤');
  return json;
}

/* ============================================================
   init — 檢查登入狀態 + 載入文章
   ============================================================ */
async function init() {
  setStatus('⏳ 載入中…', 'saving');
  try {
    // 嘗試恢復 session（server 端驗證 cookie）
    const { user } = await api('/auth/me').catch(() => ({ user: null }));
    currentUser = user || null;

    setStatus('✅', 'saved');
    updateHeader();
    renderEntries();
  } catch (err) {
    console.error(err);
    setStatus('❌', '');
  }
}

/* ============================================================
   Header
   ============================================================ */
function updateHeader() {
  const el = document.getElementById('header-auth');

  if (filterAuthor) {
    el.innerHTML = `
      <span class="filter-chip">
        👤 ${esc(filterAuthor)}
        <button class="filter-clear" onclick="clearAuthorFilter()">×</button>
      </span>`;
    setWelcome(
      `👤 ${esc(filterAuthor)} 的文章`,
      '點擊右上角 ✕ 可恢復顯示全部'
    );
    document.getElementById('auth-toolbar').style.display = currentUser ? '' : 'none';
    document.getElementById('demo-hint').style.display = 'none';
    return;
  }

  if (currentUser) {
    el.innerHTML = `
      <span class="user-chip">👤 ${esc(currentUser.username)}</span>
      <button class="logout-btn" onclick="logout()">登出</button>`;
    setWelcome(
      `👋 ${esc(currentUser.username)}，歡迎回來！`,
      '可以發表新文章或看看大家的動態。'
    );
    document.getElementById('auth-toolbar').style.display = '';
    document.getElementById('demo-hint').style.display = 'none';
  } else {
    el.innerHTML = `
      <button class="header-btn" onclick="openAuth('login')">登入</button>
      <button class="header-btn primary" onclick="openAuth('reg')">註冊</button>`;
    setWelcome(
      '👋 歡迎來到網頁日誌系統',
      '這是一個公開日誌牆，所有人的文章都能看到。'
    );
    document.getElementById('auth-toolbar').style.display = 'none';
    document.getElementById('demo-hint').style.display = '';
  }
}

function setWelcome(title, sub) {
  document.getElementById('welcome-title').textContent = title;
  document.getElementById('welcome-sub').textContent   = sub;
}

/* ============================================================
   作者過濾
   ============================================================ */
function filterByAuthor(username) {
  filterAuthor = username;
  updateHeader();
  renderEntries();
}

function clearAuthorFilter() {
  filterAuthor = null;
  updateHeader();
  renderEntries();
}

/* ============================================================
   Auth
   ============================================================ */
function openAuth(tab) {
  switchAuth(tab || 'login');
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAuth() {
  document.getElementById('auth-modal').classList.remove('open');
  setMsg('');
  setMsgReg('');
  document.body.style.overflow = '';
}

function switchAuth(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-reg').classList.toggle('active', !isLogin);
  document.getElementById('login-form').style.display = isLogin ? '' : 'none';
  document.getElementById('reg-form').style.display    = !isLogin ? '' : 'none';
  setMsg('');
  setMsgReg('');
  document.getElementById('auth-brand-title').innerHTML =
    isLogin ? '你的想法<br>值得被看見' : '加入我們<br>開始記錄一切';
}

async function handleRegister(e) {
  e.preventDefault();
  const u  = document.getElementById('reg-username').value.trim();
  const p  = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;

  if (!u || !p)         { setMsgReg('❌ 請填寫所有欄位'); return; }
  if (p !== p2)         { setMsgReg('❌ 兩次密碼不同'); return; }
  if (p.length < 4)     { setMsgReg('❌ 密碼至少 4 個字元'); return; }

  try {
    const { user } = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: u, password: p }),
    });
    currentUser = user;
    closeAuth();
    updateHeader();
    renderEntries();
  } catch (err) {
    setMsgReg('❌ ' + err.message);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if (!u || !p) { setMsg('❌ 請填寫所有欄位'); return; }

  try {
    const { user } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: u, password: p }),
    });
    currentUser = user;
    closeAuth();
    updateHeader();
    renderEntries();
  } catch (err) {
    setMsg('❌ ' + err.message);
  }
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
  currentUser = null;
  updateHeader();
  renderEntries();
}

/* ============================================================
   文章列表
   ============================================================ */
async function renderEntries() {
  const q = document.getElementById('search-input').value;

  // 組 URL 參數
  const params = new URLSearchParams();
  if (filterAuthor) params.set('author', filterAuthor);
  if (q)             params.set('q', q);

  const path = '/entries' + (params.toString() ? '?' + params.toString() : '');

  let entries = [];
  try {
    const { entries: data } = await api(path);
    entries = data || [];
  } catch (err) {
    console.error(err);
  }

  const el = document.getElementById('entry-list');

  document.getElementById('stat-total').textContent = entries.length;
  document.getElementById('stat-authors').textContent =
    [...new Set(entries.map(e => e.username))].length;
  document.getElementById('stat-latest').textContent =
    entries.length ? (entries[0].date || entries[0].created_at.slice(0, 10)) : '—';

  if (!entries.length) {
    const hint = filterAuthor
      ? `「${esc(filterAuthor)}」還沒有發表過文章`
      : (q ? `找不到符合「${esc(q)}」的文章` : '還沒有文章，成為第一個發表的人吧！');
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>${hint}</p></div>`;
    return;
  }

  el.innerHTML = entries.map(e => `
    <div class="entry-card">
      <div class="entry-header" onclick="openView(${e.id})">
        <div>
          <div class="entry-title">${esc(e.title)}</div>
          <div class="entry-meta">
            <span class="entry-author"
                  onclick="event.stopPropagation(); filterByAuthor('${escAttr(e.username)}')">
              👤 ${esc(e.username)}
            </span>
            <span>📅 ${e.date || e.created_at.slice(0, 10)}</span>
            <span>🕒 ${e.created_at.slice(11, 16)}</span>
          </div>
        </div>
        ${currentUser && currentUser.id === e.user_id ? `
        <div class="entry-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary" onclick="openEntryForm(${e.id})">✏️</button>
          <button class="btn btn-danger" onclick="delEntry(${e.id})">🗑️</button>
        </div>` : ''}
      </div>
    </div>`).join('');
}

/* ============================================================
   發文 / 編輯
   ============================================================ */
function openEntryForm(id) {
  if (!currentUser) { openAuth('login'); return; }

  if (id) {
    // 從當前列表找到這筆
    const e = window._cachedEntries?.find(x => x.id === id);
    if (!e || e.user_id !== currentUser.id) return;
    document.getElementById('edit-entry-id').value = id;
    document.getElementById('entry-title').value   = e.title;
    document.getElementById('entry-date').value    = e.date || '';
    document.getElementById('entry-content').value  = e.content || '';
    document.getElementById('entry-modal-title').textContent = '✏️ 編輯文章';
  } else {
    document.getElementById('edit-entry-id').value = '';
    document.getElementById('entry-title').value   = '';
    document.getElementById('entry-date').value    = new Date().toISOString().split('T')[0];
    document.getElementById('entry-content').value  = '';
    document.getElementById('entry-modal-title').textContent = '＋ 發表文章';
  }

  document.getElementById('entry-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('entry-title').focus();
}

function closeEntryForm() {
  document.getElementById('entry-modal').classList.remove('open');
  document.body.style.overflow = '';
}

async function saveEntry() {
  if (!currentUser) return;
  const id    = document.getElementById('edit-entry-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const date  = document.getElementById('entry-date').value;
  const cont  = document.getElementById('entry-content').value;
  if (!title) { alert('請輸入標題'); return; }

  try {
    if (id) {
      await api(`/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content: cont, date }),
      });
    } else {
      await api('/entries', {
        method: 'POST',
        body: JSON.stringify({ title, content: cont, date }),
      });
    }
    closeEntryForm();
    renderEntries();
  } catch (err) {
    alert('儲存失敗：' + err.message);
  }
}

/* ============================================================
   檢視
   ============================================================ */
function openView(id) {
  const e = window._cachedEntries?.find(x => x.id === id);
  if (!e) return;
  document.getElementById('view-title').textContent = e.title;
  document.getElementById('view-meta').innerHTML =
    `<span class="entry-author" onclick="closeView(); filterByAuthor('${escAttr(e.username)}')">
       👤 ${esc(e.username)}
     </span>
     <span>📅 ${e.date || e.created_at.slice(0, 10)}</span>
     <span>🕒 ${e.created_at.slice(11, 16)}</span>`;
  document.getElementById('view-content').textContent = e.content || '(無內容)';
  document.getElementById('view-actions').innerHTML =
    (currentUser && currentUser.id === e.user_id)
      ? `<button class="btn btn-danger" onclick="delEntry(${e.id})">🗑️ 刪除</button>
         <button class="btn btn-primary" onclick="closeView(); openEntryForm(${e.id})">✏️ 編輯</button>`
      : '';
  document.getElementById('view-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeView() {
  document.getElementById('view-modal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   刪除
   ============================================================ */
async function delEntry(id) {
  if (!currentUser) return;
  if (!confirm('確定刪除？')) return;
  try {
    await api(`/entries/${id}`, { method: 'DELETE' });
    closeView();
    renderEntries();
  } catch (err) {
    alert('刪除失敗：' + err.message);
  }
}

// 快取當前文章列表（給 openView / openEntryForm 查找用）
window._cachedEntries = [];

// 增強 renderEntries 來更新快取
const _origRender = renderEntries;
// renderEntries 改為 async 並更新快取
async function renderEntries() {
  const q = document.getElementById('search-input').value;
  const params = new URLSearchParams();
  if (filterAuthor) params.set('author', filterAuthor);
  if (q)             params.set('q', q);
  const path = '/entries' + (params.toString() ? '?' + params.toString() : '');

  let entries = [];
  try {
    const { entries: data } = await api(path);
    entries = data || [];
  } catch (_) {}

  window._cachedEntries = entries;
  // （以下內聯執行原本的渲染邏輯）
  const el = document.getElementById('entry-list');
  document.getElementById('stat-total').textContent = entries.length;
  document.getElementById('stat-authors').textContent =
    [...new Set(entries.map(e => e.username))].length;
  document.getElementById('stat-latest').textContent =
    entries.length ? (entries[0].date || entries[0].created_at.slice(0, 10)) : '—';

  if (!entries.length) {
    const hint = filterAuthor
      ? `「${esc(filterAuthor)}」還沒有發表過文章`
      : (q ? `找不到符合「${esc(q)}」的文章` : '還沒有文章，成為第一個發表的人吧！');
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>${hint}</p></div>`;
    return;
  }

  el.innerHTML = entries.map(e => `
    <div class="entry-card">
      <div class="entry-header" onclick="openView(${e.id})">
        <div>
          <div class="entry-title">${esc(e.title)}</div>
          <div class="entry-meta">
            <span class="entry-author"
                  onclick="event.stopPropagation(); filterByAuthor('${escAttr(e.username)}')">
              👤 ${esc(e.username)}
            </span>
            <span>📅 ${e.date || e.created_at.slice(0, 10)}</span>
            <span>🕒 ${e.created_at.slice(11, 16)}</span>
          </div>
        </div>
        ${currentUser && currentUser.id === e.user_id ? `
        <div class="entry-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary" onclick="openEntryForm(${e.id})">✏️</button>
          <button class="btn btn-danger" onclick="delEntry(${e.id})">🗑️</button>
        </div>` : ''}
      </div>
    </div>`).join('');
}

/* ============================================================
   匯出 / 匯入（Node.js 版本：匯出 JSON，匯入 JSON）
   ============================================================ */
async function exportDB() {
  try {
    const { entries } = await api('/entries');
    const blob = new Blob([JSON.stringify({ entries }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `journal_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert('匯出失敗：' + err.message);
  }
}

function importDB(file) {
  if (!file) return;
  alert('匯入功能需手動對應，請見說明文件。');
}

/* ============================================================
   工具
   ============================================================ */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'");
}

function setStatus(txt, cls) {
  const el = document.getElementById('db-status');
  if (el) { el.textContent = txt; el.className = cls || ''; }
}

function setMsg(txt)    { document.getElementById('auth-msg').textContent = txt; }
function setMsgReg(txt) { const el = document.getElementById('auth-msg-reg'); if (el) el.textContent = txt; }

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);

['auth-modal', 'entry-modal', 'view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) {
      if (id === 'auth-modal')      closeAuth();
      else if (id === 'entry-modal') closeEntryForm();
      else closeView();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeEntryForm(); closeView(); }
});
