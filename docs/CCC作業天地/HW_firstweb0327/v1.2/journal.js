/**
 * 網頁日誌系統 v1.2 - journal.js
 *
 * 新功能：
 * - 點擊作者名稱 →只看該作者文章
 * - 右上角顯示目前過濾狀態，可一鍵清除
 *
 * 資料流程：
 * 1. fetch seed.db → 存入 IndexedDB（key: journal_sqlite_v2）
 * 2. 之後所有操作都在記憶體 SQLite 執行
 * 3. 自動 persist 回 IndexedDB
 */

let db = null;
let currentUser = null;
let filterAuthor = null;   // null = 顯示全部，非 null = 只看該作者

const DB_KEY   = 'journal_sqlite_v2';
const SESSION = 'journal_session_v2';

// ─────────────────────────────────────────
// SHA-256
// ─────────────────────────────────────────
async function sha256(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sha256sync(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ─────────────────────────────────────────
// IndexedDB
// ─────────────────────────────────────────
function idb(mode, key, val) {
  return new Promise((res, rej) => {
    const req = indexedDB.open('journalDB_v2', 1);
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
// Init
// ─────────────────────────────────────────
async function init() {
  setStatus('⏳ 載入中…', 'saving');
  try {
    const SQL = await initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
    });

    let raw = null;
    try { raw = await idb('readonly', DB_KEY); } catch(e) {}

    if (raw) {
      db = new SQL.Database(new Uint8Array(raw));
    } else {
      const res = await fetch('seed.db');
      if (!res.ok) throw new Error('seed.db fetch failed');
      const buf = await res.arrayBuffer();
      db = new SQL.Database(new Uint8Array(buf));
      await idb('readwrite', DB_KEY, Array.from(db.export()));
    }

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
    await persist();

    // session
    const saved = sessionStorage.getItem(SESSION);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const st = db.prepare('SELECT * FROM users WHERE id = ?');
        st.bind([u.id]);
        if (st.step()) currentUser = st.getAsObject();
        st.free();
      } catch(e) { sessionStorage.removeItem(SESSION); }
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
// Persist
// ─────────────────────────────────────────
async function persist() {
  if (!db) return;
  try { await idb('readwrite', DB_KEY, Array.from(db.export()))); } catch(e) {}
}

// ─────────────────────────────────────────
// Header
// ─────────────────────────────────────────
function updateHeader() {
  const el = document.getElementById('header-auth');

  if (filterAuthor) {
    el.innerHTML = `
      <span class="filter-chip">
        👤 ${esc(filterAuthor)}
        <button class="filter-clear" onclick="clearAuthorFilter()">×</button>
      </span>
    `;
    document.getElementById('banner-new-btn').textContent = '＋ 發表文章';
    document.getElementById('welcome-title').textContent = `👤 ${esc(filterAuthor)} 的文章`;
    document.getElementById('welcome-sub').textContent = '點擊右上角 ✕ 可恢復顯示全部';
    document.getElementById('auth-toolbar').style.display = currentUser ? '' : 'none';
    document.getElementById('demo-hint').style.display = 'none';
    return;
  }

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
// 作者過濾
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// Auth
// ─────────────────────────────────────────
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
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-reg').classList.toggle('active', tab === 'reg');
  document.getElementById('login-form').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('reg-form').style.display  = tab === 'reg'  ? '' : 'none';
  setMsg('');
  setMsgReg('');
  document.getElementById('auth-brand-title').innerHTML =
    tab === 'login'
      ? '你的想法<br>值得被看見'
      : '加入我們<br>開始記錄一切';
}

async function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;
  if (!u || !p) { setMsgReg('❌ 請填寫所有欄位'); return; }
  if (p !== p2) { setMsgReg('❌ 兩次密碼不同'); return; }
  if (p.length < 4) { setMsgReg('❌ 密碼至少 4 個字元'); return; }

  const hash = sha256sync(p);
  const st = db.prepare('SELECT id FROM users WHERE username = ?');
  st.bind([u]);
  if (st.step()) { st.free(); setMsgReg('❌ 帳號已有人使用'); return; }
  st.free();

  db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [u, hash]);
  await persist();

  const res = db.exec(`SELECT id, username FROM users WHERE username = '${u.replace(/'/g,"''")}'`);
  if (res.length) {
    currentUser = { id: res[0].values[0][0], username: res[0].values[0][1] };
    sessionStorage.setItem(SESSION, JSON.stringify(currentUser));
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

  const hash = sha256sync(p);
  const st = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?');
  st.bind([u, hash]);
  let found = null;
  if (st.step()) found = st.getAsObject();
  st.free();

  if (!found) { setMsg('❌ 帳號或密碼錯誤'); return; }

  currentUser = found;
  sessionStorage.setItem(SESSION, JSON.stringify(currentUser));
  closeAuth();
  updateHeader();
  renderEntries();
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION);
  updateHeader();
  renderEntries();
}

// ─────────────────────────────────────────
// 文章列表
// ─────────────────────────────────────────
function getAll(query = '') {
  if (!db) return [];
  const q = query.trim().replace(/'/g, "''");
  const fa = filterAuthor ? filterAuthor.replace(/'/g, "''") : '';

  let sql;
  if (q && fa) {
    sql = `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id=u.id
           WHERE u.username='${fa}' AND (e.title LIKE '%${q}%' OR e.content LIKE '%${q}%')
           ORDER BY e.created_at DESC`;
  } else if (fa) {
    sql = `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id=u.id
           WHERE u.username='${fa}'
           ORDER BY e.created_at DESC`;
  } else if (q) {
    sql = `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id=u.id
           WHERE e.title LIKE '%${q}%' OR e.content LIKE '%${q}%'
           ORDER BY e.created_at DESC`;
  } else {
    sql = `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id=u.id
           ORDER BY e.created_at DESC`;
  }

  const res = db.exec(sql);
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map(r => { const o = {}; cols.forEach((c,i) => o[c]=r[i]); return o; });
}

function renderEntries() {
  const q   = document.getElementById('search-input').value;
  const all = getAll(q);
  const el  = document.getElementById('entry-list');

  document.getElementById('stat-total').textContent = all.length;
  const authors = [...new Set(all.map(e => e.username))];
  document.getElementById('stat-authors').textContent = authors.length;
  document.getElementById('stat-latest').textContent =
    all.length ? (all[0].date || all[0].created_at.slice(0,10)) : '—';

  if (!all.length) {
    const hint = filterAuthor
      ? `「${esc(filterAuthor)}」還沒有發表過文章`
      : (q ? `找不到符合「${esc(q)}」的文章` : '還沒有文章，成為第一個發表的人吧！');
    el.innerHTML = `<div class="empty"><div class="icon">📭</div><p>${hint}</p></div>`;
    return;
  }

  el.innerHTML = all.map(e => `
    <div class="entry-card">
      <div class="entry-header" onclick="openView(${e.id})">
        <div>
          <div class="entry-title">${esc(e.title)}</div>
          <div class="entry-meta">
            <span class="entry-author" onclick="event.stopPropagation(); filterByAuthor('${escAttr(e.username)}')">
              👤 ${esc(e.username)}
            </span>
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
// 發文 / 編輯
// ─────────────────────────────────────────
function openEntryForm(id) {
  if (!currentUser) { openAuth('login'); return; }
  const editId  = document.getElementById('edit-entry-id');
  const titleEl  = document.getElementById('entry-title');
  const dateEl   = document.getElementById('entry-date');
  const contEl   = document.getElementById('entry-content');

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
// 檢視
// ─────────────────────────────────────────
function openView(id) {
  const e = getAll().find(x => x.id === id);
  if (!e) return;
  document.getElementById('view-title').textContent = e.title;
  document.getElementById('view-meta').innerHTML =
    `<span class="entry-author" onclick="closeView(); filterByAuthor('${escAttr(e.username)}')">👤 ${esc(e.username)}</span>
     <span>📅 ${e.date||e.created_at.slice(0,10)}</span>
     <span>🕒 ${e.created_at.slice(11,16)}</span>`;
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
      sessionStorage.removeItem(SESSION);
      currentUser = null;
      filterAuthor = null;
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

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function setStatus(txt, cls) {
  const el = document.getElementById('db-status');
  if (el) { el.textContent = txt; el.className = cls || ''; }
}

function setMsg(txt)    { document.getElementById('auth-msg').textContent = txt; }
function setMsgReg(txt) { const el = document.getElementById('auth-msg-reg'); if (el) el.textContent = txt; }

// ─────────────────────────────────────────
// Boot
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

['auth-modal','entry-modal','view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'auth-modal')    closeAuth();
      else if (id === 'entry-modal') closeEntryForm();
      else closeView();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeEntryForm(); closeView(); }
});
