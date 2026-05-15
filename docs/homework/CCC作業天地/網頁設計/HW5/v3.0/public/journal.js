/**
 * public/journal.js — v3.0
 *
 * v3.0 新功能：
 * - Hash 路由（#/ → 首頁，#/profile/:username → 個人頁）
 * - 亮/暗版主題切換（CSS data-theme）
 * - 個人設定（bio、avatar 色彩、背景圖）
 * - 追蹤/取消追蹤功能
 * - 個人頁展示（粉絲數、追蹤數、文章列表）
 * - 完整 Loading 狀態
 */
'use strict';

/* ============================================================
   全域狀態
   ============================================================ */
let currentUser  = null;
let filterAuthor = null;
let currentTheme = localStorage.getItem('journal_theme') || 'light';

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
  if (res.status === 204) return {};
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/* ============================================================
   Loading 状态
   ============================================================ */
function setBtnLoading(sel, on) {
  const btn = document.querySelector(sel);
  if (!btn) return;
  if (on) { btn.dataset._orig = btn.textContent.trim(); btn.textContent = '⏳ 處理中…'; btn.disabled = true; }
  else { btn.textContent = btn.dataset._orig || btn.textContent; btn.disabled = false; }
}

function restoreAllBtns() {
  document.querySelectorAll('[data-_orig]').forEach(b => {
    b.textContent = b.dataset._orig; b.disabled = false;
  });
}

/* ============================================================
   主題系統
   ============================================================ */
function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('journal_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-light-btn')?.classList.toggle('active', theme === 'light');
  document.getElementById('theme-dark-btn')?.classList.toggle('active', theme === 'dark');
}

/* ============================================================
   Hash 路由
   ============================================================ */
function getHash() {
  return window.location.hash.slice(1) || '/';
}

function parseHash() {
  const hash = getHash();
  if (hash.startsWith('/profile/')) {
    return { page: 'profile', username: decodeURIComponent(hash.split('/profile/')[1]) };
  }
  return { page: 'home' };
}

function navigateTo(path) {
  window.location.hash = path;
}

function navigateHome() {
  navigateTo('/');
}

function navigateProfile(username) {
  navigateTo(`/profile/${encodeURIComponent(username)}`);
}

async function handleHashChange() {
  const { page, username } = parseHash();

  document.getElementById('view-home').style.display    = page === 'home' ? '' : 'none';
  document.getElementById('view-profile').style.display = page === 'profile' ? '' : 'none';

  if (page === 'home') {
    renderEntries();
  } else if (page === 'profile') {
    await renderProfile(username);
  }
}

window.addEventListener('hashchange', handleHashChange);

/* ============================================================
   init
   ============================================================ */
async function init() {
  // 套用主題
  setTheme(currentTheme);

  setStatus('⏳ 載入中…', 'saving');
  try {
    const { user } = await api('/auth/me').catch(() => ({ user: null }));
    currentUser = user || null;
    setStatus('✅', 'saved');
    updateHeader();
    handleHashChange();
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

  // 主題切換按鈕
  const themeBtn = `
    <button class="header-btn" onclick="toggleTheme()" title="切換亮/暗版"
      style="font-size:1rem;padding:0.3rem 0.6rem;">
      ${currentTheme === 'light' ? '🌙' : '☀️'}
    </button>`;

  if (currentUser) {
    el.innerHTML = `
      ${themeBtn}
      <button class="header-btn" onclick="navigateProfile('${escAttr(currentUser.username)}')">👤 ${esc(currentUser.username)}</button>
      <button class="logout-btn" onclick="logout()">登出</button>`;
    document.getElementById('auth-toolbar').style.display = '';
    document.getElementById('btn-my-articles').style.display = '';
    document.getElementById('btn-settings').style.display = '';
    document.getElementById('demo-hint').style.display = 'none';
    document.getElementById('banner-new-btn').textContent = '＋ 發表文章';
    document.getElementById('welcome-title').textContent = `👋 ${esc(currentUser.username)}，歡迎回來！`;
    document.getElementById('welcome-sub').textContent = '可以發表新文章或看看大家的動態。';
  } else {
    el.innerHTML = `
      ${themeBtn}
      <button class="header-btn" onclick="openAuth('login')">登入</button>
      <button class="header-btn primary" onclick="openAuth('reg')">註冊</button>`;
    document.getElementById('auth-toolbar').style.display = 'none';
    document.getElementById('btn-my-articles').style.display = 'none';
    document.getElementById('btn-settings').style.display = 'none';
    document.getElementById('demo-hint').style.display = '';
    document.getElementById('banner-new-btn').textContent = '＋ 發表文章';
    document.getElementById('welcome-title').textContent = '👋 歡迎來到網頁日誌系統';
    document.getElementById('welcome-sub').textContent = '這是一個公開日誌牆，所有人的文章都能看到。';
  }
}

function toggleTheme() {
  setTheme(currentTheme === 'light' ? 'dark' : 'light');
  // 即時套用到 header 按鈕
  const btn = document.querySelector('.header-right .header-btn[onclick*="toggleTheme"]');
  if (btn) btn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
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
  setMsg(''); setMsgReg('');
  document.body.style.overflow = '';
  restoreAllBtns();
}

function switchAuth(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-reg').classList.toggle('active', !isLogin);
  document.getElementById('login-form').style.display = isLogin ? '' : 'none';
  document.getElementById('reg-form').style.display = !isLogin ? '' : 'none';
  setMsg(''); setMsgReg('');
  document.getElementById('auth-brand-title').innerHTML =
    isLogin ? '你的想法<br>值得被看見' : '加入我們<br>開始記錄一切';
}

async function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;
  if (!u || !p) { setMsgReg('❌ 請填寫所有欄位'); return; }
  if (p !== p2) { setMsgReg('❌ 兩次密碼不同'); return; }
  if (p.length < 4) { setMsgReg('❌ 密碼至少 4 個字元'); return; }
  setBtnLoading('#reg-form [type=submit]', true);
  try {
    const { user } = await api('/auth/register', { method: 'POST', body: { username: u, password: p } });
    currentUser = user;
    closeAuth();
    updateHeader();
    handleHashChange();
  } catch (err) { setMsgReg('❌ ' + err.message); }
  finally { setBtnLoading('#reg-form [type=submit]', false); }
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
    handleHashChange();
  } catch (err) { setMsg('❌ ' + err.message); }
  finally { setBtnLoading('#login-form [type=submit]', false); }
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
  currentUser = null;
  updateHeader();
  navigateHome();
}

/* ============================================================
   文章列表（首頁）
   ============================================================ */
async function renderEntries() {
  const q = document.getElementById('search-input').value;
  const params = new URLSearchParams();
  if (filterAuthor) params.set('author', filterAuthor);
  if (q) {
    if (q.startsWith('#')) params.set('tag', q.slice(1).trim());
    else { params.set('q', q); }
  }
  const page = parseInt(sessionStorage.getItem('entry_page') || '1', 10);
  params.set('page', page);
  params.set('limit', 10);
  const path = '/entries' + (params.toString() ? '?' + params.toString() : '');

  let entries = [], total = 0, totalPages = 1;
  try {
    const data = await api(path);
    entries = data.entries || [];
    total = data.total;
    totalPages = data.totalPages;
  } catch (err) { console.error(err); }

  window._cachedEntries = entries;

  const el = document.getElementById('entry-list');
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-authors').textContent = [...new Set(entries.map(e => e.username))].length;
  document.getElementById('stat-latest').textContent =
    entries.length ? (entries[0].date || entries[0].created_at.slice(0, 10)) : '—';

  updatePaginationUI(page, totalPages);

  if (!entries.length) {
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>找不到文章</p></div>`;
    return;
  }

  el.innerHTML = entries.map(e => renderEntryCard(e)).join('');
}

function renderEntryCard(e) {
  const tags = e.tags ? e.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const tagsHtml = tags.length
    ? `<div class="entry-tags">${tags.map(t =>
        `<span class="tag-chip" onclick="event.stopPropagation(); filterByTag('${escAttr(t)}')">#${esc(t)}</span>`
      ).join('')}</div>` : '';

  const avatarStyle = e.avatar_color
    ? `background:${e.avatar_color};color:white;`
    : `background:var(--accent);color:white;`;

  return `
    <div class="entry-card">
      <div class="entry-header" onclick="openView(${e.id})">
        <div style="display:flex;align-items:flex-start;gap:0.75rem;">
          <div class="entry-avatar" style="width:38px;height:38px;border-radius:50%;${avatarStyle}display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;">
            ${e.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="entry-title">${esc(e.title)}</div>
            <div class="entry-meta">
              <span class="entry-author cursor"
                    onclick="event.stopPropagation(); navigateProfile('${escAttr(e.username)}')">
                👤 ${esc(e.username)}
              </span>
              <span>📅 ${e.date || e.created_at.slice(0, 10)}</span>
              <span>🕒 ${e.created_at.slice(11, 16)}</span>
            </div>
            ${tagsHtml}
          </div>
        </div>
        ${currentUser && currentUser.id === e.user_id ? `
        <div class="entry-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary" onclick="openEntryForm(${e.id})">✏️</button>
          <button class="btn btn-danger" onclick="delEntry(${e.id})">🗑️</button>
        </div>` : ''}
      </div>
    </div>`;
}

/* ============================================================
   分頁 UI
   ============================================================ */
function updatePaginationUI(page, totalPages) {
  const el = document.getElementById('pagination-ui');
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <span class="page-indicator">第 ${page} 頁，共 ${totalPages} 頁</span>
    <button class="btn btn-ghost" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>← 上一頁</button>
    <button class="btn btn-ghost" onclick="goPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>下一頁 →</button>
  `;
}

function goPage(p) {
  sessionStorage.setItem('entry_page', p);
  renderEntries();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   我的文章
   ============================================================ */
function filterMyArticles() {
  if (!currentUser) { openAuth('login'); return; }
  filterAuthor = currentUser.username;
  sessionStorage.setItem('entry_page', '1');
  document.getElementById('search-input').value = '';
  renderEntries();
}

function filterByTag(tag) {
  filterAuthor = null;
  sessionStorage.setItem('entry_page', '1');
  document.getElementById('search-input').value = `#${tag}`;
  renderEntries();
}

/* ============================================================
   個人頁
   ============================================================ */
async function renderProfile(username) {
  const el = document.getElementById('profile-entries');
  el.innerHTML = `<div class="empty"><div class="icon">⏳</div><p>載入中…</p></div>`;

  try {
    const { user } = await api(`/users/${encodeURIComponent(username)}`);
    const color = user.avatar_color || '#0f766e';

    document.getElementById('profile-username').textContent = '@' + user.username;
    document.getElementById('profile-bio').textContent = user.bio || '這位作者還沒有填寫個人簡介。';
    document.getElementById('profile-followers').textContent = user.followers_count;
    document.getElementById('profile-following').textContent = user.following_count;

    document.getElementById('profile-avatar').textContent = user.username.charAt(0).toUpperCase();
    document.getElementById('profile-avatar').style.background = color;

    // 背景
    if (user.background) {
      document.getElementById('profile-header').style.backgroundImage = `url('${escAttr(user.background)}')`;
      document.getElementById('profile-header').style.backgroundSize = 'cover';
      document.getElementById('profile-header').style.backgroundPosition = 'center';
    } else {
      document.getElementById('profile-header').style.background = `linear-gradient(135deg, ${color}44, ${color}22)`;
      document.getElementById('profile-header').style.backgroundImage = '';
    }

    // 操作區（追蹤按鈕）
    const acts = document.getElementById('profile-actions');
    if (user.isMe) {
      acts.innerHTML = `<button class="btn btn-secondary" onclick="openSettings()">⚙️ 編輯個人頁</button>`;
    } else if (currentUser && user.isFollowing) {
      acts.innerHTML = `<button class="btn btn-danger" id="btn-follow" onclick="toggleFollow('${escAttr(username)}')">✓ 已追蹤</button>`;
    } else if (currentUser) {
      acts.innerHTML = `<button class="btn btn-primary" id="btn-follow" onclick="toggleFollow('${escAttr(username)}')">＋ 追蹤</button>`;
    } else {
      acts.innerHTML = '';
    }

    renderProfileEntries();
  } catch (err) {
    el.innerHTML = `<div class="empty"><div class="icon">❌</div><p>找不到這個使用者。</p></div>`;
  }
}

async function renderProfileEntries() {
  const username = parseHash().username;
  const q = document.getElementById('profile-search-input').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const path = `/users/${encodeURIComponent(username)}/entries` + (params.toString() ? '?' + params.toString() : '');

  let entries = [];
  try {
    const data = await api(path);
    entries = data.entries || [];
  } catch (_) {}

  const el = document.getElementById('profile-entries');
  if (!entries.length) {
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>這位作者還沒有發表過文章。</p></div>`;
    return;
  }
  el.innerHTML = entries.map(e => renderEntryCard(e)).join('');
}

async function toggleFollow(username) {
  if (!currentUser) { openAuth('login'); return; }
  const btn = document.getElementById('btn-follow');
  const wasFollowing = btn && btn.textContent.includes('已追蹤');
  setBtnLoading('#btn-follow', true);
  try {
    if (wasFollowing) {
      await api(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' });
      document.getElementById('btn-follow').textContent = '＋ 追蹤';
      document.getElementById('btn-follow').className = 'btn btn-primary';
      document.getElementById('profile-followers').textContent =
        parseInt(document.getElementById('profile-followers').textContent) - 1;
    } else {
      await api(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' });
      document.getElementById('btn-follow').textContent = '✓ 已追蹤';
      document.getElementById('btn-follow').className = 'btn btn-danger';
      document.getElementById('profile-followers').textContent =
        parseInt(document.getElementById('profile-followers').textContent) + 1;
    }
  } catch (err) { alert('❌ ' + err.message); }
  finally { setBtnLoading('#btn-follow', false); }
}

/* ============================================================
   設定
   ============================================================ */
function openSettings() {
  if (!currentUser) { openAuth('login'); return; }
  document.getElementById('setting-bio').value = currentUser.bio || '';
  document.getElementById('setting-color').value = currentUser.avatar_color || '#0f766e';
  document.getElementById('setting-color-label').textContent = currentUser.avatar_color || '#0f766e';
  document.getElementById('setting-bg').value = currentUser.background || '';
  document.getElementById('setting-color').oninput = function() {
    document.getElementById('setting-color-label').textContent = this.value;
  };
  setTheme(currentTheme);
  document.getElementById('settings-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
  document.body.style.overflow = '';
  restoreAllBtns();
}

async function saveSettings() {
  const bio = document.getElementById('setting-bio').value;
  const avatar_color = document.getElementById('setting-color').value;
  const background = document.getElementById('setting-bg').value;
  setBtnLoading('.form-actions .btn-primary', true);
  try {
    const { user } = await api('/users/me', {
      method: 'PUT',
      body: { bio, avatar_color, background },
    });
    currentUser = { ...currentUser, ...user };
    closeSettings();
    updateHeader();
    handleHashChange();
  } catch (err) { alert('❌ ' + err.message); }
  finally { setBtnLoading('.form-actions .btn-primary', false); }
}

/* ============================================================
   發文 / 編輯
   ============================================================ */
function openEntryForm(id) {
  if (!currentUser) { openAuth('login'); return; }
  if (id) {
    const e = window._cachedEntries?.find(x => x.id === id);
    if (!e || e.user_id !== currentUser.id) return;
    document.getElementById('edit-entry-id').value = id;
    document.getElementById('entry-title').value = e.title;
    document.getElementById('entry-date').value = e.date || '';
    document.getElementById('entry-tags').value = e.tags || '';
    document.getElementById('entry-content').value = e.content || '';
    document.getElementById('entry-modal-title').textContent = '✏️ 編輯文章';
  } else {
    document.getElementById('edit-entry-id').value = '';
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('entry-tags').value = '';
    document.getElementById('entry-content').value = '';
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
  const id = document.getElementById('edit-entry-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const date = document.getElementById('entry-date').value;
  const tags = document.getElementById('entry-tags').value.trim();
  const cont = document.getElementById('entry-content').value;
  if (!title) { alert('請輸入標題'); return; }
  setBtnLoading('.form-actions .btn-success', true);
  try {
    if (id) {
      await api(`/entries/${id}`, { method: 'PUT', body: { title, content: cont, date, tags } });
    } else {
      await api('/entries', { method: 'POST', body: { title, content: cont, date, tags } });
    }
    closeEntryForm();
    if (parseHash().page === 'profile') renderProfileEntries();
    else renderEntries();
  } catch (err) { alert('❌ ' + err.message); }
  finally { setBtnLoading('.form-actions .btn-success', false); }
}

/* ============================================================
   檢視
   ============================================================ */
function openView(id) {
  const e = window._cachedEntries?.find(x => x.id === id);
  if (!e) return;
  document.getElementById('view-title').textContent = e.title;
  const tags = e.tags ? e.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  document.getElementById('view-meta').innerHTML =
    `<span class="entry-author cursor" onclick="closeView(); navigateProfile('${escAttr(e.username)}')">👤 ${esc(e.username)}</span>
     <span>📅 ${e.date || e.created_at.slice(0, 10)}</span>
     <span>🕒 ${e.created_at.slice(11, 16)}</span>`;
  document.getElementById('view-tags').innerHTML = tags.length
    ? tags.map(t => `<span class="tag-chip" onclick="closeView(); document.getElementById('search-input').value='#${escAttr(t)}';renderEntries()">#${esc(t)}</span>`).join('')
    : '';
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
    if (parseHash().page === 'profile') renderProfileEntries();
    else renderEntries();
  } catch (err) { alert('❌ ' + err.message); }
}

/* ============================================================
   匯出入
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
  } catch (err) { alert('❌ ' + err.message); }
}

function importDB(file) {
  if (!file) return;
  alert('匯入功能需手動對應，請見說明文件。');
}

/* ============================================================
   工具
   ============================================================ */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) { return String(str).replace(/'/g,"\\'"); }
function setStatus(txt, cls) { const el = document.getElementById('db-status'); if (el) { el.textContent = txt; el.className = cls || ''; } }
function setMsg(txt) { document.getElementById('auth-msg').textContent = txt; }
function setMsgReg(txt) { const el = document.getElementById('auth-msg-reg'); if (el) el.textContent = txt; }

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);

['auth-modal','entry-modal','view-modal','settings-modal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'auth-modal') closeAuth();
      else if (id === 'entry-modal') closeEntryForm();
      else if (id === 'settings-modal') closeSettings();
      else closeView();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeEntryForm(); closeSettings(); closeView(); }
});
