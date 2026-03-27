/**
 * 網頁日誌系統 v1.1 - journal.js
 * 公開日誌牆 + Auth Modal + 預設 SQLite 資料庫
 *
 * 資料流程：
 * 1. 嘗試從 IndexedDB 讀取既有的 .db
 * 2. 若無（第一次），fetch 同目錄的 seed.db → 存入 IndexedDB
 * 3. 之後所有操作都在記憶體中的 SQLite 執行，自動儲存回 IndexedDB
 */

let db = null;          // sql.js Database instance
let currentUser = null;  // 當前登入使用者
const DB_KEY   = 'journal_sqlite_v1';    // IndexedDB key for user data
const SEED_KEY = 'journal_seed_loaded_v1'; // IndexedDB key: 已載入 seed 標記

// ─────────────────────────────────────────
// SHA-256（Web Crypto API）
// ─────────────────────────────────────────
async function sha256(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────
// IndexedDB helper（Promise 化）
// ─────────────────────────────────────────
function idb(mode, key, val) {
  return new Promise((res, rej) => {
    const req = indexedDB.open('journalDB3', 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('s'); };
    req.onsuccess = () => {
      try {
        const t = req.result.transaction('s', mode);
        const s = t.objectStore('s');
        const r = val === undefined ? s.get(key) : s.put(val, key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch(e) { rej(e); }
    };
    req.onerror = () => rej(req.error);
  });
}

// ─────────────────────────────────────────
// SQLite init
// ─────────────────────────────────────────
async function loadSQL() {
  const SQL = await initSqlJs({
    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
  });

  // 先看 IndexedDB 有沒有既有的 db
  let raw = null;
  try { raw = await idb('readonly', DB_KEY); } catch(e) {}

  if (raw) {
    // 有舊資料，直接用
    return new SQL.Database(new Uint8Array(raw));
  }

  // 第一次：fetch seed.db
  try {
    const res = await fetch('seed.db');
    if (!res.ok) throw new Error('seed.db fetch failed');
    const buf = await res.arrayBuffer();
    const newDb = new SQL.Database(new Uint8Array(buf));
    // 立即寫入 IndexedDB
    await idb('readwrite', DB_KEY, Array.from(newDb.export()));
    await idb('readwrite', SEED_KEY, true);
    return newDb;
  } catch(e) {
    // fetch 失敗（本地無 server），建立空白 db
    return new SQL.Database();
  }
}

// ─────────────────────────────────────────
// Init
// ─────────────────────────────────────────
async function init() {
  setStatus('⏳ 載入中...', 'saving');
  try {
    db = await loadSQL();

    // 確保 tables 存在（從 seed.db 載入時已有，空白 db 才需要建立）
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 嘗試儲存（空白 db 需要 write）
    await persist();

    // 檢查 session
    const saved = sessionStorage.getItem('journal_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        stmt.bind([u.id]);
        if (stmt.step()) {
          currentUser = stmt.getAsObject();
        } else {
          sessionStorage.removeItem('journal_session');
        }
        stmt.free();
      } catch(e) { sessionStorage.removeItem('journal_session'); }
    }

    setStatus('✅', 'saved');
    updateHeader();
    renderEntries();

  } catch(err) {
    console.error(err);
    setStatus('❌', '');
  }
}

// ─────────────────────────────────────────
// Persist to IndexedDB（所有寫入後自動呼叫）
// ─────────────────────────────────────────
async function persist() {
  if (!db) return;
  try {
    await idb('readwrite', DB_KEY, Array.from(db.export()));
  } catch(e) {}
}

// ─────────────────────────────────────────
// Header：登入/登出 按鈕
// ─────────────────────────────────────────
function updateHeader() {
  const el = document.getElementById('header-auth');
  if (currentUser) {
    el.innerHTML = `
      <span class="user-chip">👤 ${esc(currentUser.username)}</span>
      <button class="logout-btn" onclick="logout()">登出</button>
    `;
    document.getElementById('banner-new-btn').textContent = '＋ 發表文章';
    document.getElementById('auth-toolbar').style.display = '';
    document.getElementById('welcome-title').textContent = `👋 ${esc(currentUser.username)}，歡迎回來！`;
    document.getElementById('welcome-sub').textContent = '可以發表新文章或看看大家的動態。';
    document.getElementById('demo-hint').style.display = 'none';
  } else {
    el.innerHTML = `
      <button class="header-btn" onclick="openAuth('login')">登入</button>
      <button class="header-btn primary" onclick="openAuth('reg')">註冊</button>
    `;
    document.getElementById('banner-new-btn').textContent = '＋ 發表文章';
    document.getElementById('auth-toolbar').style.display = 'none';
    document.getElementById('welcome-title').textContent = '👋 歡迎來到網頁日誌系統';
    document.getElementById('welcome-sub').textContent = '這是一個公開日誌牆，所有人的文章都能看到。';
    document.getElementById('demo-hint').style.display = '';
  }
}

// ─────────────────────────────────────────
// Auth Modal
// ─────────────────────────────────────────
function openAuth(tab) {
  switchAuthTab(tab || 'login');
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAuth() {
  document.getElementById('auth-modal').classList.remove('open');
  document.getElementById('auth-msg').textContent = '';
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-reg').classList.toggle('active', tab === 'reg');
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('reg-form').style.display  = tab === 'reg'  ? 'block' : 'none';
  document.getElementById('auth-msg').textContent = '';
  document.getElementById('auth-modal-title').textContent = tab === 'login' ? '登入' : '註冊';
}

async function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;
  if (!u || !p) { setMsg('❌ 請填寫所有欄位'); return; }
  if (p !== p2) { setMsg('❌ 兩次密碼不同'); return; }
  if (p.length < 4) { setMsg('❌ 密碼至少 4 個字元'); return; }

  const hash = sha256_sync(p); // sync version for DB ops
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([u]);
  if (stmt.step()) { stmt.free(); setMsg('❌ 帳號已有人使用'); return; }
  stmt.free();

  db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [u, hash]);
  await persist();

  const res = db.exec(`SELECT id, username FROM users WHERE username = '${u.replace(/'/g,"''")}'`);
  if (res.length > 0) {
    currentUser = { id: res[0].values[0][0], username: res[0].values[0][1] };
    sessionStorage.setItem('journal_session', JSON.stringify(currentUser));
  }

  closeAuth();
  updateHeader();
  renderEntries();
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if (!u || !p) { setMsg('❌ 請填寫所有欄位'); return; }

  const hash = sha256_sync(p);
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?');
  stmt.bind([u, hash]);
  let found = null;
  if (stmt.step()) found = stmt.getAsObject();
  stmt.free();

  if (!found) { setMsg('❌ 帳號或密碼錯誤'); return; }

  currentUser = found;
  sessionStorage.setItem('journal_session', JSON.stringify(currentUser));
  closeAuth();
  updateHeader();
  renderEntries();
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('journal_session');
  updateHeader();
  renderEntries();
}

// sync sha256 for DB (not for passwords stored in DB)
function sha256_sync(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function setMsg(txt) { document.getElementById('auth-msg').textContent = txt; }

// ─────────────────────────────────────────
// 文章列表（所有人可見）
// ─────────────────────────────────────────
function getAll(query = '') {
  if (!db) return [];
  const q = query.trim().replace(/'/g, "''");
  let sql = q
    ? `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id=u.id
       WHERE e.title LIKE '%${q}%' OR e.content LIKE '%${q}%'
       ORDER BY e.created_at DESC`
    : `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id=u.id
       ORDER BY e.created_at DESC`;

  const res = db.exec(sql);
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map(r => { const o = {}; cols.forEach((c,i) => o[c]=r[i]); return o; });
}

function renderEntries() {
  const q   = document.getElementById('search-input').value;
  const all = getAll(q);
  const el  = document.getElementById('entry-list');

  // stats
  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-authors').textContent = [...new Set(all.map(e => e.username))].length;
  document.getElementById('stat-latest').textContent =
    all.length ? (all[0].date || all[0].created_at.slice(0,10)) : '—';

  if (!all.length) {
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>${q ? '找不到符合「'+esc(q)+'」的文章' : '還沒有文章，成為第一個發表的人吧！'}</p></div>`;
    return;
  }

  el.innerHTML = all.map(e => `
    <div class="entry-card">
      <div class="entry-header" onclick="openView(${e.id})">
        <div>
          <div class="entry-title">${esc(e.title)}</div>
          <div class="entry-meta">
            <span class="entry-author">👤 ${esc(e.username)}</span>
            <span>📅 ${e.date || e.created_at.slice(0,10)}</span>
            <span>🕒 ${e.created_at.slice(11,16)}</span>
          </div>
        </div>
        ${currentUser && currentUser.id === e.user_id ? `
        <div class="entry-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary" onclick="openEntryForm(${e.id})">✏️</button>
          <button class="btn btn-danger" onclick="delEntry(${e.id})">🗑️</button>
        </div>` : ''}
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────
// 發文 / 編輯 Modal
// ─────────────────────────────────────────
function openEntryForm(id) {
  if (!currentUser) { openAuth('login'); return; }
  const editId  = document.getElementById('edit-entry-id');
  const titleEl = document.getElementById('entry-title');
  const dateEl  = document.getElementById('entry-date');
  const contEl  = document.getElementById('entry-content');

  if (id) {
    const e = getAll().find(x => x.id === id);
    if (!e || e.user_id !== currentUser.id) return;
    editId.value = id;
    titleEl.value = e.title;
    dateEl.value  = e.date || '';
    contEl.value  = e.content || '';
    document.getElementById('entry-modal-title').textContent = '✏️ 編輯文章';
  } else {
    editId.value = '';
    titleEl.value = '';
    dateEl.value  = new Date().toISOString().split('T')[0];
    contEl.value  = '';
    document.getElementById('entry-modal-title').textContent = '＋ 發表文章';
  }

  document.getElementById('entry-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  titleEl.focus();
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

  if (id) {
    db.run("UPDATE entries SET title=?,content=?,date=?,updated_at=datetime('now','localtime') WHERE id=? AND user_id=?",
      [title, cont, date||null, id, currentUser.id]);
  } else {
    db.run('INSERT INTO entries (user_id,title,content,date) VALUES (?,?,?,?)',
      [currentUser.id, title, cont, date||new Date().toISOString().split('T')[0]]);
  }

  await persist();
  closeEntryForm();
  renderEntries();
}

// ─────────────────────────────────────────
// 查看 Modal
// ─────────────────────────────────────────
function openView(id) {
  const e = getAll().find(x => x.id === id);
  if (!e) return;
  document.getElementById('view-title').textContent = e.title;
  document.getElementById('view-meta').textContent =
    `👤 ${esc(e.username)} · 📅 ${e.date||e.created_at.slice(0,10)} · 🕒 ${e.created_at.slice(11,16)}`;
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

// ─────────────────────────────────────────
// 刪除
// ─────────────────────────────────────────
async function delEntry(id) {
  if (!currentUser) return;
  if (!confirm('確定刪除？')) return;
  db.run('DELETE FROM entries WHERE id=? AND user_id=?', [id, currentUser.id]);
  await persist();
  closeView();
  renderEntries();
}

// ─────────────────────────────────────────
// 匯出 / 匯入
// ─────────────────────────────────────────
function exportDB() {
  if (!db) return;
  const blob = new Blob([db.export()], {type:'application/x-sqlite3'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `journal_${new Date().toISOString().slice(0,10)}.db`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importDB(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const SQL = await initSqlJs({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      });
      db = new SQL.Database(new Uint8Array(e.target.result));
      await idb('readwrite', DB_KEY, Array.from(db.export()));
      sessionStorage.removeItem('journal_session');
      currentUser = null;
      updateHeader();
      renderEntries();
      alert('匯入成功！請重新登入。');
    } catch(err) { alert('匯入失敗：' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// ─────────────────────────────────────────
// 工具
// ─────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function setStatus(txt, cls) {
  const el = document.getElementById('db-status');
  if (el) { el.textContent = txt; el.className = cls || ''; }
}

// ─────────────────────────────────────────
// Boot
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

// Background click closes modal
['auth-modal','entry-modal','view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'auth-modal')   closeAuth();
      else if (id === 'entry-modal') closeEntryForm();
      else closeView();
    }
  });
});

// Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeEntryForm(); closeView(); }
});
