/**
 * 網頁日誌系統 v1.1 - journal.js
 * 使用 sql.js（WASM SQLite）+ IndexedDB 持久化
 * 密碼使用 SHA-256 雜湊（Web Crypto API）
 */

let db = null;
let currentUser = null;
let currentViewId = null;
let DB_KEY = 'journal_sqlite_db_v1_auth';
const SESSION_KEY = 'journal_current_user';

// ─────────────────────────────────────────
// SHA-256（密碼用 Web Crypto API）
// ─────────────────────────────────────────
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────
// Init
// ─────────────────────────────────────────
async function init() {
  const statusEl = document.getElementById('db-status');
  const authSection = document.getElementById('auth-section');
  const appSection = document.getElementById('app-section');

  try {
    statusEl.textContent = '⏳ 初始化中...';
    statusEl.className = 'saving';

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    db = await loadDB(SQL);

    // 建立 tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT    UNIQUE NOT NULL,
        password_hash TEXT   NOT NULL,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        title      TEXT    NOT NULL,
        content    TEXT,
        date       TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    saveDB();

    // 檢查 session
    const savedUser = sessionStorage.getItem(SESSION_KEY);
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        stmt.bind([user.id]);
        if (stmt.step()) {
          currentUser = stmt.getAsObject();
          authSection.style.display = 'none';
          appSection.style.display = '';
          document.getElementById('user-display').style.display = '';
          document.getElementById('user-display').textContent = `👤 ${escHtml(currentUser.username)}`;
          document.getElementById('btn-logout').style.display = '';
          renderList();
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          showAuth();
        }
        stmt.free();
      } catch (e) {
        sessionStorage.removeItem(SESSION_KEY);
        showAuth();
      }
    } else {
      showAuth();
    }

    statusEl.textContent = '✅ 已載入';
    statusEl.className = 'saved';
  } catch (err) {
    console.error('Init error:', err);
    statusEl.textContent = '❌ 初始化失敗';
    statusEl.className = '';
    // 即使失敗也顯示登入畫面
    authSection.style.display = '';
    appSection.style.display = 'none';
  }
}

// ─────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-section').style.display = '';
  document.getElementById('app-section').style.display = 'none';
  document.getElementById('user-display').style.display = 'none';
  document.getElementById('btn-logout').style.display = 'none';
  document.getElementById('btn-clear').style.display = 'none';
}

function renderApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = '';
  document.getElementById('user-display').style.display = '';
  document.getElementById('user-display').textContent = `👤 ${escHtml(currentUser.username)}`;
  document.getElementById('btn-logout').style.display = '';
  renderList();
}

async function register(username, password) {
  if (!db) return { ok: false, msg: '資料庫未就緒，請稍後再試' };
  if (!username.trim() || !password) return { ok: false, msg: '請填寫帳號與密碼' };
  if (password.length < 4) return { ok: false, msg: '密碼至少 4 個字元' };

  const hash = await sha256(password);

  // 檢查帳號是否已存在
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([username.trim()]);
  if (stmt.step()) {
    stmt.free();
    return { ok: false, msg: '帳號已有人使用' };
  }
  stmt.free();

  db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username.trim(), hash]);
  saveDB();

  // 取回剛建立的使用者並登入
  const result = db.exec(
    `SELECT id, username FROM users WHERE username = '${username.trim().replace(/'/g, "''")}'`
  );
  if (result.length > 0 && result[0].values.length > 0) {
    currentUser = { id: result[0].values[0][0], username: result[0].values[0][1] };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  }

  return { ok: true };
}

async function login(username, password) {
  if (!db) return { ok: false, msg: '資料庫未就緒，請稍後再試' };
  if (!username.trim() || !password) return { ok: false, msg: '請填寫帳號與密碼' };

  const hash = await sha256(password);
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?');
  stmt.bind([username.trim(), hash]);

  let found = null;
  if (stmt.step()) found = stmt.getAsObject();
  stmt.free();

  if (!found) return { ok: false, msg: '帳號或密碼錯誤' };

  currentUser = found;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  return { ok: true };
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  showAuth();
}

// ─────────────────────────────────────────
// IndexedDB 持久化
// ─────────────────────────────────────────
function idbGet(key) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('journalDB', 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('store'); };
    req.onsuccess = () => {
      try {
        const t = req.result.transaction('store', 'readonly');
        const r = t.objectStore('store').get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      } catch (e) { reject(e); }
    };
    req.onerror = () => reject(req.error);
  });
}

function idbPut(key, val) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('journalDB', 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('store'); };
    req.onsuccess = () => {
      try {
        const t = req.result.transaction('store', 'readwrite');
        const r = t.objectStore('store').put(val, key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      } catch (e) { reject(e); }
    };
    req.onerror = () => reject(req.error);
  });
}

async function loadDB(SQL) {
  try {
    const saved = await idbGet(DB_KEY);
    if (saved) return new SQL.Database(new Uint8Array(saved));
  } catch (e) { /* ignore */ }
  return new SQL.Database();
}

async function saveDB() {
  if (!db) return;
  const statusEl = document.getElementById('db-status');
  statusEl.textContent = '💾 儲存中...';
  statusEl.className = 'saving';
  try {
    const data = db.export();
    await idbPut(DB_KEY, Array.from(data));
    statusEl.textContent = '✅ 已儲存';
    statusEl.className = 'saved';
  } catch (e) {
    statusEl.textContent = '❌ 儲存失敗';
    statusEl.className = '';
  }
}

// ─────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────
function getAll(query = '') {
  if (!db || !currentUser) return [];
  const q = query.trim();
  let stmt;
  if (q === '') {
    stmt = db.prepare('SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC');
    stmt.bind([currentUser.id]);
  } else {
    stmt = db.prepare(
      "SELECT * FROM entries WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY created_at DESC"
    );
    const likeQ = `%${q}%`;
    stmt.bind([currentUser.id, likeQ, likeQ]);
  }
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function insertEntry(title, content, date) {
  if (!db || !currentUser) return;
  const d = date || new Date().toISOString().split('T')[0];
  db.run(
    'INSERT INTO entries (user_id, title, content, date) VALUES (?, ?, ?, ?)',
    [currentUser.id, title, content, d]
  );
  saveDB();
  renderList();
}

function updateEntry(id, title, content, date) {
  if (!db || !currentUser) return;
  db.run(
    "UPDATE entries SET title=?, content=?, date=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?",
    [title, content, date || null, id, currentUser.id]
  );
  saveDB();
  renderList();
}

function deleteEntryById(id) {
  if (!db || !currentUser) return;
  db.run('DELETE FROM entries WHERE id=? AND user_id=?', [id, currentUser.id]);
  saveDB();
  renderList();
}

function clearAllEntries() {
  if (!db || !currentUser) return;
  db.run('DELETE FROM entries WHERE user_id=?', [currentUser.id]);
  saveDB();
  renderList();
}

// ─────────────────────────────────────────
// 渲染
// ─────────────────────────────────────────
function renderList() {
  if (!currentUser) return;
  const query = document.getElementById('search-input').value;
  const rows = getAll(query);
  const container = document.getElementById('journal-list');
  const clearBtn = document.getElementById('btn-clear');
  clearBtn.style.display = rows.length > 0 ? 'inline-block' : 'none';

  if (rows.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="icon">📭</div>
        <p>${query ? '找不到符合的日誌' : '還沒有日誌，點「＋ 新增日誌」開始吧！'}</p>
      </div>`;
    updateStats(0);
    return;
  }

  container.innerHTML = rows.map(row => `
    <div class="journal-card" data-id="${row.id}">
      <div class="journal-card-header" onclick="toggleCard(${row.id})">
        <div>
          <div class="journal-card-title">${escHtml(row.title)}</div>
          <div class="journal-card-meta">📅 ${row.date || row.created_at.slice(0,10)} · 🕐 ${row.created_at.slice(11,16)}</div>
        </div>
        <div class="journal-card-actions">
          <button class="btn btn-secondary" onclick="event.stopPropagation(); openForm(${row.id})">✏️</button>
          <button class="btn btn-danger" onclick="event.stopPropagation(); confirmDelete(${row.id})">🗑️</button>
        </div>
      </div>
      <div class="journal-card-body" id="body-${row.id}">
        <div class="journal-content">${escHtml(row.content || '(無內容)')}</div>
      </div>
    </div>
  `).join('');

  updateStats(rows.length);
}

function updateStats(count) {
  document.getElementById('stat-count').textContent = count;
  document.getElementById('stat-latest').textContent =
    count === 0 ? '—' : (getAll()[0]?.date || getAll()[0]?.created_at?.slice(0, 10) || '—');
}

// ─────────────────────────────────────────
// UI
// ─────────────────────────────────────────
function toggleCard(id) {
  document.getElementById(`body-${id}`).classList.toggle('open');
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-reg').classList.toggle('active', tab === 'reg');
  document.getElementById('login-form').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('reg-form').style.display = tab === 'reg' ? '' : 'none';
  document.getElementById('auth-msg').textContent = '';
}

async function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('reg-username').value;
  const p = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;
  if (p !== p2) { document.getElementById('auth-msg').textContent = '❌ 兩次密碼輸入不同'; return; }
  const result = await register(u, p);
  if (result.ok) {
    renderApp();
  } else {
    document.getElementById('auth-msg').textContent = '❌ ' + result.msg;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value;
  const p = document.getElementById('login-password').value;
  const result = await login(u, p);
  if (result.ok) {
    renderApp();
  } else {
    document.getElementById('auth-msg').textContent = '❌ ' + result.msg;
  }
}

function openForm(id) {
  const titleInput = document.getElementById('entry-title');
  const dateInput = document.getElementById('entry-date');
  const contentInput = document.getElementById('entry-content');
  const editId = document.getElementById('edit-id');
  const titleEl = document.getElementById('form-title');

  if (id) {
    const row = getAll().find(r => r.id === id);
    if (!row) return;
    editId.value = id;
    titleEl.textContent = '✏️ 編輯日誌';
    titleInput.value = row.title;
    dateInput.value = row.date || '';
    contentInput.value = row.content || '';
  } else {
    editId.value = '';
    titleEl.textContent = '＋ 新增日誌';
    titleInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    contentInput.value = '';
  }

  document.getElementById('form-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  titleInput.focus();
}

function closeForm() {
  document.getElementById('form-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function saveEntry() {
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const date = document.getElementById('entry-date').value;
  const content = document.getElementById('entry-content').value;
  if (!title) { alert('請輸入標題'); return; }
  if (id) updateEntry(parseInt(id), title, content, date);
  else insertEntry(title, content, date);
  closeForm();
}

function confirmDelete(id) {
  if (!confirm('確定要刪除這篇日誌嗎？')) return;
  deleteEntryById(id);
}

function openView(id) {
  currentViewId = id;
  const row = getAll().find(r => r.id === id);
  if (!row) return;
  document.getElementById('view-title').textContent = escHtml(row.title);
  document.getElementById('view-meta').textContent =
    `📅 ${row.date || row.created_at.slice(0,10)} · 🕒 建立：${row.created_at.slice(0,16).replace('T',' ')}`;
  document.getElementById('view-content').textContent = row.content || '(無內容)';
  document.getElementById('view-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeView() {
  document.getElementById('view-modal').classList.remove('open');
  document.body.style.overflow = '';
  currentViewId = null;
}

function editCurrentEntry() {
  if (!currentViewId) return;
  closeView();
  openForm(currentViewId);
}

function deleteEntry() {
  if (!currentViewId) return;
  if (!confirm('確定要刪除這篇日誌嗎？')) return;
  deleteEntryById(currentViewId);
  closeView();
}

function clearAll() {
  if (!confirm('⚠️ 確定要清除所有日誌嗎？此操作無法回復！')) return;
  clearAllEntries();
}

function exportDB() {
  if (!db) return;
  const data = db.export();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal_${new Date().toISOString().slice(0,10)}.db`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importDB(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = new Uint8Array(e.target.result);
      const SQL = await initSqlJs({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      });
      db = new SQL.Database(data);
      await idbPut(DB_KEY, Array.from(data));
      logout();
      alert('匯入成功！請重新登入。');
    } catch (err) {
      alert('匯入失敗：' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ─────────────────────────────────────────
// 工具
// ─────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────
// 啟動
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 確保初始狀態正確
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'none';
  init();
});

['form-modal', 'view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'form-modal') closeForm();
      else closeView();
    }
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeForm(); closeView(); }
});
