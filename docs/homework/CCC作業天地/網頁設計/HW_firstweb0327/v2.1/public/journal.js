/**
 * public/journal.js — v2.2
 *
 * v2.2 更新：
 * - Pagination：GET /api/entries 支援 ?page=&limit=，回傳 { entries, total, page, limit, totalPages }
 * - 我的文章過濾：工具列新增「我的文章」按鈕（登入後可見），使用 ?author= 查詢參數
 * - Tags 標籤：entries 表新增 tags 欄位（逗號分隔），支援新增/編輯/顯示/過濾
 * - 分頁 UI：工具列上方顯示「上一頁 / 下一頁」按鈕 + 「第 X 頁，共 Y 頁」
 * - 搜尋列支援 tag 過濾（?tag=）
 */
'use strict';

/* ============================================================
   全域狀態
   ============================================================ */
let currentUser  = null;  // { id, username }
let filterAuthor = null;  // null = 顯示全部
let currentPage  = 1;
let totalPages   = 1;
let totalEntries = 0;

/* ============================================================
   API 工具
   ============================================================ */
async function api(path, { body, ...rest } = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // DELETE 成功時可能是 204 No Content，res.ok 仍為 true 但無 json
  if (res.status === 204) return {};
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/* ============================================================
   通用 Loading 状态（按鈕 Disable）
   ============================================================ */
function setBtnLoading(sel, loading) {
  const btn = document.querySelector(sel);
  if (!btn) return;
  if (loading) {
    btn.dataset._orig = btn.textContent.trim();
    btn.disabled = true;
    btn.textContent = '⏳ 處理中…';
  } else {
    btn.textContent = btn.dataset._orig || btn.textContent;
    btn.disabled = false;
  }
}

function restoreAllBtns() {
  document.querySelectorAll('[data-_orig]').forEach(btn => {
    btn.textContent = btn.dataset._orig;
    btn.disabled = false;
  });
}

/* ============================================================
   init
   ============================================================ */
async function init() {
  setStatus('⏳ 載入中…', 'saving');
  try {
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
    setWelcome(`👤 ${esc(filterAuthor)} 的文章`, '點擊右上角 ✕ 可恢復顯示全部');
    document.getElementById('auth-toolbar').style.display = currentUser ? '' : 'none';
    document.getElementById('demo-hint').style.display = 'none';
    return;
  }

  if (currentUser) {
    el.innerHTML = `
      <span class="user-chip">👤 ${esc(currentUser.username)}</span>
      <button class="logout-btn" onclick="logout()">登出</button>`;
    setWelcome(`👋 ${esc(currentUser.username)}，歡迎回來！`, '可以發表新文章或看看大家的動態。');
    document.getElementById('auth-toolbar').style.display = '';
    document.getElementById('demo-hint').style.display = 'none';
  } else {
    el.innerHTML = `
      <button class="header-btn" onclick="openAuth('login')">登入</button>
      <button class="header-btn primary" onclick="openAuth('reg')">註冊</button>`;
    setWelcome('👋 歡迎來到網頁日誌系統', '這是一個公開日誌牆，所有人的文章都能看到。');
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
  currentPage  = 1;
  updateHeader();
  renderEntries();
}

function clearAuthorFilter() {
  filterAuthor = null;
  currentPage  = 1;
  updateHeader();
  renderEntries();
}

/* ============================================================
   我的文章過濾（僅登入者可見）
   ============================================================ */
function filterMyArticles() {
  if (!currentUser) return;
  filterAuthor = currentUser.username;
  currentPage  = 1;
  updateHeader();
  renderEntries();
}

/* ============================================================
   分頁導航
   ============================================================ */
function goToPage(p) {
  currentPage = Math.max(1, Math.min(totalPages, p));
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
  restoreAllBtns();
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
  if (p.length < 4)    { setMsgReg('❌ 密碼至少 4 個字元'); return; }

  setBtnLoading('#reg-form [type=submit]', true);
  try {
    const { user } = await api('/auth/register', { method: 'POST', body: { username: u, password: p } });
    currentUser = user;
    closeAuth();
    updateHeader();
    renderEntries();
  } catch (err) {
    setMsgReg('❌ ' + err.message);
  } finally {
    setBtnLoading('#reg-form [type=submit]', false);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if (!u || !p) { setMsg('❌ 請填寫所有欄位'); return; }

  setBtnLoading('#login-form [type=submit]', true);
  try {
    const { user } = await api('/auth/login', { method: 'POST', body: { username: u, password: p } });
    currentUser = user;
    closeAuth();
    updateHeader();
    renderEntries();
  } catch (err) {
    setMsg('❌ ' + err.message);
  } finally {
    setBtnLoading('#login-form [type=submit]', false);
  }
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
  currentUser = null;
  filterAuthor = null;
  currentPage  = 1;
  updateHeader();
  renderEntries();
}

/* ============================================================
   文章列表（含分頁 + Tags）
   ============================================================ */
async function renderEntries() {
  const q    = document.getElementById('search-input').value.trim();
  const params = new URLSearchParams();
  if (filterAuthor) params.set('author', filterAuthor);
  if (q)             params.set('q', q);
  params.set('page',  currentPage);
  params.set('limit', 10);

  const path = '/entries' + (params.toString() ? '?' + params.toString() : '');

  let entries   = [];
  let total     = 0;
  let page      = 1;
  let limit     = 10;
  let totalPages = 1;

  try {
    const data = await api(path);
    entries    = data.entries   || [];
    total      = data.total     || 0;
    page       = data.page      || 1;
    limit      = data.limit     || 10;
    totalPages = data.totalPages|| 1;
  } catch (err) {
    console.error(err);
  }

  totalEntries = total;
  currentPage  = page;
  totalPages   = totalPages;

  window._cachedEntries = entries;

  const el = document.getElementById('entry-list');

  // 更新統計
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-authors').textContent =
    [...new Set(entries.map(e => e.username))].length;
  document.getElementById('stat-latest').textContent =
    total > 0 ? `第 ${page} / ${totalPages} 頁` : '—';

  // 更新分頁 UI
  updatePaginationUI(page, totalPages);

  if (!entries.length) {
    const hint = filterAuthor
      ? `「${esc(filterAuthor)}」還沒有發表過文章`
      : (q ? `找不到符合「${esc(q)}」的文章` : '還沒有文章，成為第一個發表的人吧！');
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>${hint}</p></div>`;
    return;
  }

  el.innerHTML = entries.map(e => {
    // 解析 tags
    const tags = e.tags
      ? e.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const tagsHtml = tags.length
      ? `<div class="entry-tags">${tags.map(t =>
          `<span class="tag-chip" onclick="filterByTag('${escAttr(t)}')">#${esc(t)}</span>`
        ).join('')}</div>`
      : '';

    return `
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
          ${tagsHtml}
        </div>
        ${currentUser && currentUser.id === e.user_id ? `
        <div class="entry-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary" onclick="openEntryForm(${e.id})">✏️</button>
          <button class="btn btn-danger" onclick="delEntry(${e.id})">🗑️</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   分頁 UI
   ============================================================ */
function updatePaginationUI(page, totalPages) {
  const el = document.getElementById('pagination-ui');
  if (!el) return;

  el.innerHTML = `
    <button class="btn btn-ghost" onclick="goToPage(${page - 1})"
            ${page <= 1 ? 'disabled' : ''}>⬅️ 上一頁</button>
    <span class="page-indicator">第 ${page} 頁，共 ${totalPages} 頁</span>
    <button class="btn btn-ghost" onclick="goToPage(${page + 1})"
            ${page >= totalPages ? 'disabled' : ''}>下一頁 ➡️</button>
  `;
}

/* ============================================================
   Tag 過濾
   ============================================================ */
function filterByTag(tag) {
  document.getElementById('search-input').value = '#' + tag;
  currentPage = 1;
  renderEntries();
}

/* ============================================================
   發文 / 編輯（含 Tags）
   ============================================================ */
function openEntryForm(id) {
  if (!currentUser) { openAuth('login'); return; }

  if (id) {
    const e = window._cachedEntries?.find(x => x.id === id);
    if (!e || e.user_id !== currentUser.id) return;
    document.getElementById('edit-entry-id').value   = id;
    document.getElementById('entry-title').value    = e.title;
    document.getElementById('entry-date').value     = e.date || '';
    document.getElementById('entry-content').value   = e.content || '';
    document.getElementById('entry-tags').value      = e.tags || '';
    document.getElementById('entry-modal-title').textContent = '✏️ 編輯文章';
  } else {
    document.getElementById('edit-entry-id').value   = '';
    document.getElementById('entry-title').value    = '';
    document.getElementById('entry-date').value     = new Date().toISOString().split('T')[0];
    document.getElementById('entry-content').value   = '';
    document.getElementById('entry-tags').value      = '';
    document.getElementById('entry-modal-title').textContent = '＋ 發表文章';
  }

  document.getElementById('entry-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('entry-title').focus();
}

function closeEntryForm() {
  document.getElementById('entry-modal').classList.remove('open');
  document.body.style.overflow = '';
  restoreAllBtns();
}

async function saveEntry() {
  if (!currentUser) return;
  const id    = document.getElementById('edit-entry-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const date  = document.getElementById('entry-date').value;
  const cont  = document.getElementById('entry-content').value;
  const tags  = document.getElementById('entry-tags').value.trim();
  if (!title) { alert('請輸入標題'); return; }

  setBtnLoading('.form-actions .btn-success', true);
  try {
    if (id) {
      await api(`/entries/${id}`, { method: 'PUT', body: { title, content: cont, date, tags } });
    } else {
      await api('/entries', { method: 'POST', body: { title, content: cont, date, tags } });
    }
    closeEntryForm();
    renderEntries();
  } catch (err) {
    alert('儲存失敗：' + err.message);
  } finally {
    setBtnLoading('.form-actions .btn-success', false);
  }
}

/* ============================================================
   檢視（含 Tags）
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

  // Tags in view modal
  const tags = e.tags
    ? e.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];
  const viewTagsHtml = tags.length
    ? `<div class="view-tags">${tags.map(t =>
        `<span class="tag-chip" onclick="closeView(); filterByTag('${escAttr(t)}')">#${esc(t)}</span>`
      ).join('')}</div>`
    : '';
  document.getElementById('view-tags').innerHTML = viewTagsHtml;

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
   刪除（204 No Content 也能正確處理）
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

/* ============================================================
   匯出（Node.js 版：匯出 JSON）
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

function setMsg(txt)     { document.getElementById('auth-msg').textContent = txt; }
function setMsgReg(txt)  { const el = document.getElementById('auth-msg-reg'); if (el) el.textContent = txt; }

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);

['auth-modal', 'entry-modal', 'view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) {
      if (id === 'auth-modal')       closeAuth();
      else if (id === 'entry-modal') closeEntryForm();
      else closeView();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeEntryForm(); closeView(); }
});
