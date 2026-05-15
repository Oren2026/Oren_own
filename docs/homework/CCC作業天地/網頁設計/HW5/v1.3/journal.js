/**
 * 網頁日誌系統 v1.3 - journal.js
 *
 * 重構目標：讓 SQLite 邏輯更清晰、安全
 *
 * 改進：
 * - DB class 包裝所有 SQL 操作，參數化查詢杜絕注入
 * - 統一的錯誤處理
 * - persist() 改為同步（sql.js 的 export 是同步的，Promise 只是裝飾）
 * - 拿掉 handleRegister 裡混用的 exec 字串拼接
 */

'use strict';

/* ============================================================
   DB — SQLite 操作封裝
   ============================================================ */
class DB {
  constructor(sqliteDb) { this.db = sqliteDb; }

  // 通用單筆查詢（參數化）
  get(sql, args = []) {
    const st = this.db.prepare(sql);
    st.bind(args);
    if (!st.step()) { st.free(); return null; }
    const row = st.getAsObject();
    st.free();
    return row;
  }

  // 通用多筆查詢（參數化）
  all(sql, args = []) {
    const st = this.db.prepare(sql);
    if (args.length) st.bind(args);
    const rows = [];
    while (st.step()) rows.push(st.getAsObject());
    st.free();
    return rows;
  }

  // 執行寫入（INSERT/UPDATE/DELETE）
  run(sql, args = []) {
    this.db.run(sql, args);
  }

  // 匯出 Blob
  export() {
    return this.db.export();
  }
}

/* ============================================================
   全域狀態
   ============================================================ */
let db = null;           // DB 實例
let currentUser = null;  // { id, username }
let filterAuthor = null; // null = 顯示全部

const DB_KEY  = 'journal_sqlite_v3';   // v1.3 用新 key，避開舊版殘留
const SESSION = 'journal_session_v3';

/* ============================================================
   SHA-256（sync，給密碼用）
   ============================================================ */
function sha256sync(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/* ============================================================
   IndexedDB 工具
   ============================================================ */
function idbPromise(mode, key, val) {
  return new Promise((res, rej) => {
    const req = indexedDB.open('journalDB_v3', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('s');
    req.onsuccess = () => {
      const t = req.result.transaction('s', mode);
      const s = t.objectStore('s');
      const r = val === undefined ? s.get(key) : s.put(val, key);
      r.onsuccess = () => res(r.result);
      r.onerror  = () => rej(r.error);
    };
    req.onerror = () => rej(req.error);
  });
}

const idb = {
  async save(data) {
    await idbPromise('readwrite', DB_KEY, data);
  },
  async load() {
    return idbPromise('readonly', DB_KEY);
  }
};

/* ============================================================
   持久化（sql.js 的 export() 是同步的）
   ============================================================ */
function persist() {
  if (!db) return;
  const data = Array.from(db.export());
  // fire-and-forget，背景儲存
  idb.save(data).catch(() => {});
}

/* ============================================================
   init
   ============================================================ */
async function init() {
  setStatus('⏳ 載入中…', 'saving');
  try {
    const SQL = await initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
    });

    // 嘗試從 IndexedDB 讀取
    let raw = null;
    try { raw = await idb.load(); } catch (_) {}

    if (raw) {
      db = new DB(new SQL.Database(new Uint8Array(raw)));
    } else {
      // 沒有就 fetch seed.db
      const res = await fetch('seed.db');
      if (!res.ok) throw new Error('seed.db 讀取失敗');
      const buf = await res.arrayBuffer();
      db = new DB(new SQL.Database(new Uint8Array(buf)));
    }

    // 確保 table 存在（防止 seed.db 缺少 schema）
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT    UNIQUE NOT NULL,
        password_hash TEXT    NOT NULL,
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
    persist();

    // 恢復 session
    const saved = sessionStorage.getItem(SESSION);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const user = db.get('SELECT * FROM users WHERE id = ?', [u.id]);
        if (user) currentUser = user;
        else sessionStorage.removeItem(SESSION);
      } catch (_) { sessionStorage.removeItem(SESSION); }
    }

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

function handleRegister(e) {
  e.preventDefault();
  const u  = document.getElementById('reg-username').value.trim();
  const p  = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;

  if (!u || !p)          { setMsgReg('❌ 請填寫所有欄位'); return; }
  if (p !== p2)         { setMsgReg('❌ 兩次密碼不同'); return; }
  if (p.length < 4)      { setMsgReg('❌ 密碼至少 4 個字元'); return; }

  // 檢查帳號是否重複（參數化查詢）
  const existing = db.get('SELECT id FROM users WHERE username = ?', [u]);
  if (existing) { setMsgReg('❌ 帳號已有人使用'); return; }

  // 寫入新使用者
  const hash = sha256sync(p);
  db.run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [u, hash]
  );
  persist();

  // 取回新建立的用戶
  const newUser = db.get('SELECT id, username FROM users WHERE username = ?', [u]);
  if (!newUser) { setMsgReg('❌ 註冊失敗，請重試'); return; }

  currentUser = newUser;
  sessionStorage.setItem(SESSION, JSON.stringify(currentUser));
  closeAuth();
  updateHeader();
  renderEntries();
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if (!u || !p) { setMsg('❌ 請填寫所有欄位'); return; }

  const hash = sha256sync(p);
  const user = db.get(
    'SELECT id, username FROM users WHERE username = ? AND password_hash = ?',
    [u, hash]
  );

  if (!user) { setMsg('❌ 帳號或密碼錯誤'); return; }

  currentUser = user;
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

/* ============================================================
   文章列表（所有參數化杜絕 SQL 注入）
   ============================================================ */
function buildQuery(sql, args, conditions) {
  // conditions: [{clause, args}, ...]
  const where = conditions.filter(c => c).map(c => c.clause);
  const allArgs = conditions.filter(c => c).flatMap(c => c.args);
  const finalSql = sql + (where.length ? ' WHERE ' + where.join(' AND ') : '');
  return { sql: finalSql, args: allArgs };
}

function getAll(query = '') {
  if (!db) return [];
  const q = query.trim();

  const conds = [];
  if (filterAuthor) conds.push({ clause: "u.username = ?", args: [filterAuthor] });
  if (q)            conds.push({ clause: "(e.title LIKE ? OR e.content LIKE ?)", args: [`%${q}%`, `%${q}%`] });

  const { sql, args } = buildQuery(
    `SELECT e.*, u.username
       FROM entries e
       JOIN users u ON e.user_id = u.id`,
    [],
    conds
  );

  return db.all(sql + ' ORDER BY e.created_at DESC', args);
}

function renderEntries() {
  const q   = document.getElementById('search-input').value;
  const all = getAll(q);
  const el  = document.getElementById('entry-list');

  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-authors').textContent = [...new Set(all.map(e => e.username))].length;
  document.getElementById('stat-latest').textContent =
    all.length ? (all[0].date || all[0].created_at.slice(0, 10)) : '—';

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

  const isEdit = !!id;
  if (isEdit) {
    const e = getAll().find(x => x.id === id);
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

function saveEntry() {
  if (!currentUser) return;
  const id    = document.getElementById('edit-entry-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const date  = document.getElementById('entry-date').value;
  const cont  = document.getElementById('entry-content').value;
  if (!title) { alert('請輸入標題'); return; }

  if (id) {
    db.run(
      "UPDATE entries SET title=?,content=?,date=?,updated_at=datetime('now','localtime') WHERE id=? AND user_id=?",
      [title, cont, date || null, Number(id), currentUser.id]
    );
  } else {
    db.run(
      'INSERT INTO entries (user_id,title,content,date) VALUES (?,?,?,?)',
      [currentUser.id, title, cont, date || new Date().toISOString().split('T')[0]]
    );
  }

  persist();
  closeEntryForm();
  renderEntries();
}

/* ============================================================
   檢視
   ============================================================ */
function openView(id) {
  const e = getAll().find(x => x.id === id);
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
function delEntry(id) {
  if (!currentUser) return;
  if (!confirm('確定刪除？')) return;
  db.run('DELETE FROM entries WHERE id = ? AND user_id = ?', [Number(id), currentUser.id]);
  persist();
  closeView();
  renderEntries();
}

/* ============================================================
   匯出 / 匯入
   ============================================================ */
function exportDB() {
  if (!db) return;
  const blob = new Blob([db.export()], { type: 'application/x-sqlite3' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `journal_${new Date().toISOString().slice(0, 10)}.db`;
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
      db = new DB(new SQL.Database(new Uint8Array(e.target.result)));
      persist();
      sessionStorage.removeItem(SESSION);
      currentUser  = null;
      filterAuthor = null;
      updateHeader();
      renderEntries();
      alert('匯入成功！請重新登入。');
    } catch (err) { alert('匯入失敗：' + err.message); }
  };
  reader.readAsArrayBuffer(file);
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
      if (id === 'auth-modal')    closeAuth();
      else if (id === 'entry-modal') closeEntryForm();
      else closeView();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAuth(); closeEntryForm(); closeView(); }
});
