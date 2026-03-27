/**
 * 網頁日誌系統 v1.1 - journal.js
 * 新增：使用者註冊 / 登入系統
 * 使用 sql.js（WASM SQLite）+ IndexedDB 持久化
 * 密碼使用 SHA-256 雜湊（Web Crypto API）
 */

let db = null;
let currentUser = null;      // 目前登入的使用者
let currentViewId = null;
let DB_KEY = 'journal_sqlite_db_v1_auth';
const SESSION_KEY = 'journal_current_user';

// ─────────────────────────────────────────
// SHA-256 雜湊（密碼用）
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
  const status = document.getElementById('db-status');
  try {
    status.textContent = '⏳ 初始化中...';
    status.className = 'saving';

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    db = await loadDB(SQL);

    // 建立資料表
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
      const user = JSON.parse(savedUser);
      // 驗證使用者仍存在於 DB
      const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND username = ?');
      stmt.bind([user.id, user.username]);
      if (stmt.step()) {
        currentUser = stmt.getAsObject();
        renderApp(); // 已登入，直接顯示應用
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        showAuth();  // session 無效，顯示登入
      }
      stmt.free();
    } else {
      showAuth(); // 未登入，顯示登入
    }

    status.textContent = '✅ 已載入';
    status.className = 'saved';
  } catch (err) {
    status.textContent = '❌ 初始化失敗';
    status.className = '';
    console.error('DB init error:', err);
  }
}

// ─────────────────────────────────────────
// IndexedDB 持久化
// ─────────────────────────────────────────
function idbKeyVal(key, val) {
  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open('journalDB', 1);
    openReq.onupgradeneeded = e => {
      e.target.result.createObjectStore('store');
    };
    const handleReq = (req, mode) => {
      const t = openReq.result.transaction('store', mode);
      const s = t.objectStore('store');
      const r = val === undefined ? s.get(key) : s.put(val, key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    };
    openReq.onsuccess = () => {
      if (val === undefined) {
        handleReq(openReq, 'readonly');
      } else {
        handleReq(openReq, 'readwrite');
      }
    };
    openReq.onerror = () => reject(openReq.error);
  });
}

async function loadDB(SQL) {
  try {
    const saved = await idbKeyVal(DB_KEY);
    if (saved) return new SQL.Database(new Uint8Array(saved));
  } catch (e) { /* ignore */ }
  return new SQL.Database();
}

async function saveDB() {
  if (!db) return;
  const status = document.getElementById('db-status');
  status.textContent = '💾 儲存中...';
  status.className = 'saving';
  try {
    const data = db.export();
    await idbKeyVal(DB_KEY, Array.from(data));
    status.textContent = '✅ 已儲存';
    status.className = 'saved';
  } catch (e) {
    status.textContent = '❌ 儲存失敗';
    status.className = '';
  }
}

// ─────────────────────────────────────────
// Auth 邏輯
// ─────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-section').style.display = '';
  document.getElementById('app-section').style.display = 'none';
}

function renderApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = '';
  document.getElementById('user-display').textContent = `👤 ${escHtml(currentUser.username)}`;
  renderList();
}

async function register(username, password) {
  if (!db) return { ok: false, msg: '資料庫未初始化' };
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

  // 自動登入
  const newUser = db.exec(
    `SELECT * FROM users WHERE username = '${username.trim().replace(/'/g, "''")}'`
  );
  if (newUser.length > 0 && newUser[0].values.length > 0) {
    currentUser = {
      id: newUser[0].values[0][0],
      username: newUser[0].values[0][1]
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  }

  return { ok: true };
}

async function login(username, password) {
  if (!db) return { ok: false, msg: '資料庫未初始化' };
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
// CRUD（限目前登入使用者）
// ─────────────────────────────────────────
function getAll(query = '') {
  if (!db || !currentUser) return [];
  const q = query.trim();
  let stmt;
  if (q === '') {
    stmt = db.prepare(
      'SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC'
    );
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
  if (count === 0) {
    document.getElementById('stat-latest').textContent = '—';
    return;
  }
  const rows = getAll();
  if (rows.length > 0) {
    document.getElementById('stat-latest').textContent = rows[0].date || rows[0].created_at.slice(0, 10);
  }
}

// ─────────────────────────────────────────
// UI 互動
// ─────────────────────────────────────────
function toggleCard(id) {
  document.getElementById(`body-${id}`).classList.toggle('open');
}

// ── Auth Form ──
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

  if (p !== p2) {
    document.getElementById('auth-msg').textContent = '❌ 兩次密碼輸入不同';
    return;
  }

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

// ── Journal Form ──
function openForm(id) {
  const modal = document.getElementById('form-modal');
  const titleInput = document.getElementById('entry-title');
  const dateInput = document.getElementById('entry-date');
  const contentInput = document.getElementById('entry-content');
  const editId = document.getElementById('edit-id');
  const titleEl = document.getElementById('form-title');

  if (id) {
    const rows = getAll().filter(r => r.id === id);
    if (rows.length === 0) return;
    const row = rows[0];
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

  modal.classList.add('open');
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

  if (id) {
    updateEntry(parseInt(id), title, content, date);
  } else {
    insertEntry(title, content, date);
  }
  closeForm();
}

function confirmDelete(id) {
  if (!confirm('確定要刪除這篇日誌嗎？')) return;
  deleteEntryById(id);
  if (currentViewId === id) closeView();
}

// ── View Modal ──
function openView(id) {
  currentViewId = id;
  const rows = getAll().filter(r => r.id === id);
  if (rows.length === 0) return;
  const row = rows[0];
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
  closeView();
}

// ── 匯出 / 匯入 ──
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
      await idbKeyVal(DB_KEY, Array.from(data));
      // 重新檢查 session
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
document.addEventListener('DOMContentLoaded', init);

// ESC / 背景點關閉
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
