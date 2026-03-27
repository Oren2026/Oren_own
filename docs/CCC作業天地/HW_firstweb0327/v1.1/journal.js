/**
 * 網頁日誌系統 v1.1 - journal.js
 * 重新設計：公開日誌牆 + Auth Modal + 預設範例資料
 */

let db = null;
let currentUser = null;
let DB_KEY = 'journal_sqlite_v1_public';
const SESSION_KEY = 'journal_session_v1';
const INIT_KEY = 'journal_seeded_v1';

// ─────────────────────────────────────────
// SHA-256
// ─────────────────────────────────────────
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────
// IndexedDB
// ─────────────────────────────────────────
function idbReq(mode, key, val) {
  return new Promise((res, rej) => {
    const req = indexedDB.open('journalDB2', 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('store'); };
    req.onsuccess = () => {
      try {
        const t = req.result.transaction('store', mode);
        const s = t.objectStore('store');
        const r = val === undefined ? s.get(key) : s.put(val, key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch(e) { rej(e); }
    };
    req.onerror = () => rej(req.error);
  });
}

async function loadDB(SQL) {
  try {
    const saved = await idbReq('readonly', DB_KEY);
    if (saved) return new SQL.Database(new Uint8Array(saved));
  } catch(e) {}
  return new SQL.Database();
}

async function saveDB() {
  if (!db) return;
  try {
    await idbReq('readwrite', DB_KEY, Array.from(db.export()));
  } catch(e) {}
}

// ─────────────────────────────────────────
// 預設範例資料
// ─────────────────────────────────────────
const SEED_USERS = [
  { username: 'admin',   password: '1234' },
  { username: '小美',    password: '1111' },
  { username: '阿偉',    password: '2222' },
  { username: '妮妮',    password: '3333' },
];

const SEED_ENTRIES = [
  // admin
  {
    username: 'admin',
    title: '📋 系統正式上線！',
    content: '經過一整天的開發，這個使用 JS + SQLite（sql.js）打造的純前端日誌系統終於完成。</p><p>特點：\n• 所有文章公開顯示\n• 無需伺服器\n• 資料存在本地 IndexedDB\n• 支援多使用者\n• 可匯出匯入資料庫備份',
    date: '2026-03-27'
  },
  {
    username: 'admin',
    title: '🔐 關於使用者系統',
    content: '密碼使用 SHA-256 雜湊儲存，資料庫中不存放明文。</p><p>每位使用者的文章都會出現在公開日誌牆上，適合需要共享資訊的場景。',
    date: '2026-03-27'
  },
  // 小美
  {
    username: '小美',
    title: '🌸 今天天氣真好！',
    content: '下午去了虎頭山公園散步，櫻花開得正美。</p><p>空氣中有淡淡的花香，陽光也很溫和。難得在忙碌的学期中找到一個悠閒的午後。',
    date: '2026-03-25'
  },
  {
    username: '小美',
    title: '📚 資工系第一週感想',
    content: '上了 CCC 老師的課才知道，原來網頁可以這樣玩。以前只會用別人的框架，現在終於理解底層是如何運作的了。</p><p>這個日誌系統就是今天的作業，看似簡單但做起來發現處處是細節。',
    date: '2026-03-27'
  },
  {
    username: '小美',
    title: '☕ 推薦：古坑咖啡',
    content: '之前去過一次古坑綠色隧道，咖啡真的很不錯。下次如果有機會想去看看會不會出現在我們的比賽關卡裡。',
    date: '2026-03-23'
  },
  // 阿偉
  {
    username: '阿偉',
    title: '🤖 TDK 機器人大賽啟動！',
    content: '今年要參加第30屆 TDK 盃，主題是「讓世界看見雲林」。</p><p>遙控組，四大關卡：\n1. 成龍濕地生態守護\n2. 文蛤分級\n3. 稻草卷堆放\n4. 北港迎媽祖\n\n時間很趕，但很有挑戰性！',
    date: '2026-03-26'
  },
  {
    username: '阿偉',
    title: '💪 機構設計進度',
    content: '目前優先做這三個爪子：\n\n1. 托盤式底爪 — 救護候鳥娃娃\n2. 弧形夾指 — 扶正裝置藝術\n3. 推板 — 文蛤分級\n\n推板最簡單，預計最快完成。',
    date: '2026-03-27'
  },
  // 妮妮
  {
    username: '妮妮',
    title: '🌊 海洋環境教育志工日誌',
    content: '今天參加了北海岸的淨灘活動，撿了三大袋垃圾。</p><p>最誇張的是沙灘上到處可見塑膠微粒。希望更多人能關注這個問題。',
    date: '2026-03-20'
  },
  {
    username: '妮妮',
    title: '🎯 目標設定：30歲前完成博士學位',
    content: '和黑皮聊了很久他的規劃：\n\n• 2026 大四\n• 30 歲碩士畢業\n• 33 歲碩士畢業\n• 40 歲前博士\n\n時間很緊湊，但也讓人振奮。有明確目標的感覺很好。',
    date: '2026-03-24'
  },
  {
    username: '妮妮',
    title: '🎮 遙控車初體驗',
    content: '第一次用遙控車機構測試，意外地很有趣！</p><p>以前只會寫程式碼，現在接觸到硬體才知道馬達控制這麼複雜，訊號延遲、力道控制處處是學問。',
    date: '2026-03-27'
  },
];

// ─────────────────────────────────────────
// Init
// ─────────────────────────────────────────
async function init() {
  const statusEl = document.getElementById('db-status');
  try {
    statusEl.textContent = '⏳ 載入中...';
    const SQL = await initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
    });

    db = await loadDB(SQL);

    // 建表
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

    // 第一次：寫入範例資料
    const seeded = await idbReq('readonly', INIT_KEY);
    if (!seeded) {
      await seedData();
      await idbReq('readwrite', INIT_KEY, true);
    }

    await saveDB();
    statusEl.textContent = '✅';

    // 檢查 session
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const u = JSON.parse(savedSession);
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        stmt.bind([u.id]);
        if (stmt.step()) {
          currentUser = stmt.getAsObject();
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
        stmt.free();
      } catch(e) { sessionStorage.removeItem(SESSION_KEY); }
    }

    updateHeaderAuth();
    renderEntries();

  } catch(err) {
    console.error('Init error:', err);
    document.getElementById('db-status').textContent = '❌';
  }
}

async function seedData() {
  const userIdMap = {};
  for (const u of SEED_USERS) {
    const hash = await sha256(u.password);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [u.username, hash]);
    const res = db.exec(`SELECT id FROM users WHERE username = '${u.username.replace(/'/g,"''")}'`);
    if (res.length > 0) userIdMap[u.username] = res[0].values[0][0];
  }
  for (const e of SEED_ENTRIES) {
    const uid = userIdMap[e.username];
    if (!uid) continue;
    db.run(
      'INSERT INTO entries (user_id, title, content, date) VALUES (?, ?, ?, ?)',
      [uid, e.title, e.content, e.date]
    );
  }
}

// ─────────────────────────────────────────
// Header Auth 按鈕
// ─────────────────────────────────────────
function updateHeaderAuth() {
  const container = document.getElementById('header-auth');
  if (currentUser) {
    container.innerHTML = `
      <span class="user-chip">👤 ${escHtml(currentUser.username)}</span>
      <button class="logout-btn" onclick="logout()">登出</button>
    `;
    document.getElementById('banner-new-btn').textContent = '＋ 發表文章';
    document.getElementById('auth-toolbar').style.display = '';
    document.getElementById('welcome-title').textContent = `👋 ${escHtml(currentUser.username)}，歡迎回來！`;
    document.getElementById('welcome-sub').textContent = '你可以發表新文章或看看大家的動態。';
    document.getElementById('demo-hint').style.display = 'none';
  } else {
    container.innerHTML = `
      <button class="header-btn" onclick="openAuthModal('login')">登入</button>
      <button class="header-btn primary" onclick="openAuthModal('reg')">註冊</button>
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
function openAuthModal(tab) {
  switchAuthTab(tab || 'login');
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('auth-msg').textContent = '';
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-reg').classList.toggle('active', tab === 'reg');
  document.getElementById('login-form').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('reg-form').style.display = tab === 'reg' ? '' : 'none';
  document.getElementById('auth-msg').textContent = '';
  document.getElementById('auth-modal-title').textContent = tab === 'login' ? '登入' : '註冊';
}

async function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-password2').value;
  if (!u || !p) { document.getElementById('auth-msg').textContent = '❌ 請填寫所有欄位'; return; }
  if (p !== p2) { document.getElementById('auth-msg').textContent = '❌ 兩次密碼不同'; return; }
  if (p.length < 4) { document.getElementById('auth-msg').textContent = '❌ 密碼至少 4 個字元'; return; }

  const hash = await sha256(p);
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([u]);
  if (stmt.step()) { stmt.free(); document.getElementById('auth-msg').textContent = '❌ 帳號已有人使用'; return; }
  stmt.free();

  db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [u, hash]);
  await saveDB();

  const res = db.exec(`SELECT id, username FROM users WHERE username = '${u.replace(/'/g,"''")}'`);
  if (res.length > 0) {
    currentUser = { id: res[0].values[0][0], username: res[0].values[0][1] };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  }

  closeAuthModal();
  updateHeaderAuth();
  renderEntries();
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if (!u || !p) { document.getElementById('auth-msg').textContent = '❌ 請填寫所有欄位'; return; }

  const hash = await sha256(p);
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?');
  stmt.bind([u, hash]);
  let found = null;
  if (stmt.step()) found = stmt.getAsObject();
  stmt.free();

  if (!found) { document.getElementById('auth-msg').textContent = '❌ 帳號或密碼錯誤'; return; }

  currentUser = found;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  closeAuthModal();
  updateHeaderAuth();
  renderEntries();
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  updateHeaderAuth();
  renderEntries();
}

// ─────────────────────────────────────────
// Entry CRUD
// ─────────────────────────────────────────
function getAllEntries(query = '') {
  if (!db) return [];
  const q = query.trim();
  let sql;
  if (q === '') {
    sql = `SELECT e.*, u.username FROM entries e
           JOIN users u ON e.user_id = u.id
           ORDER BY e.created_at DESC`;
  } else {
    sql = `SELECT e.*, u.username FROM entries e
           JOIN users u ON e.user_id = u.id
           WHERE e.title LIKE '%${q.replace(/'/g,"''")}%'
              OR e.content LIKE '%${q.replace(/'/g,"''")}%'
           ORDER BY e.created_at DESC`;
  }
  const res = db.exec(sql);
  if (res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

function openEntryForm(id) {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  const titleEl = document.getElementById('entry-modal-title');
  const editId = document.getElementById('edit-entry-id');
  const titleInput = document.getElementById('entry-title');
  const dateInput = document.getElementById('entry-date');
  const contentInput = document.getElementById('entry-content');

  if (id) {
    const entry = getAllEntries().find(e => e.id === id);
    if (!entry) return;
    if (entry.user_id !== currentUser.id) { alert('你只能編輯自己的文章'); return; }
    editId.value = id;
    titleEl.textContent = '✏️ 編輯文章';
    titleInput.value = entry.title;
    dateInput.value = entry.date || '';
    contentInput.value = entry.content || '';
  } else {
    editId.value = '';
    titleEl.textContent = '＋ 發表文章';
    titleInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    contentInput.value = '';
  }

  document.getElementById('entry-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  titleInput.focus();
}

function closeEntryForm() {
  document.getElementById('entry-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function saveEntry() {
  if (!currentUser) return;
  const id = document.getElementById('edit-entry-id').value;
  const title = document.getElementById('entry-title').value.trim();
  const date = document.getElementById('entry-date').value;
  const content = document.getElementById('entry-content').value;
  if (!title) { alert('請輸入標題'); return; }

  if (id) {
    db.run("UPDATE entries SET title=?, content=?, date=?, updated_at=datetime('now','localtime') WHERE id=? AND user_id=?",
      [title, content, date || null, id, currentUser.id]);
  } else {
    db.run('INSERT INTO entries (user_id, title, content, date) VALUES (?, ?, ?, ?)',
      [currentUser.id, title, content, date || new Date().toISOString().split('T')[0]]);
  }

  saveDB();
  closeEntryForm();
  renderEntries();
}

function confirmDeleteEntry(id) {
  if (!currentUser) return;
  const entry = getAllEntries().find(e => e.id === id);
  if (!entry) return;
  if (entry.user_id !== currentUser.id) { alert('你只能刪除自己的文章'); return; }
  if (!confirm('確定要刪除這篇文章嗎？')) return;
  db.run('DELETE FROM entries WHERE id=? AND user_id=?', [id, currentUser.id]);
  saveDB();
  closeView();
  renderEntries();
}

// ─────────────────────────────────────────
// View Modal
// ─────────────────────────────────────────
function openView(id) {
  const entry = getAllEntries().find(e => e.id === id);
  if (!entry) return;
  document.getElementById('view-title').textContent = entry.title;
  document.getElementById('view-meta').textContent =
    `👤 ${escHtml(entry.username)} · 📅 ${entry.date || entry.created_at.slice(0,10)} · 🕒 ${entry.created_at.slice(11,16)}`;
  document.getElementById('view-content').textContent = entry.content || '(無內容)';

  const actions = document.getElementById('view-actions');
  if (currentUser && currentUser.id === entry.user_id) {
    actions.innerHTML = `
      <button class="btn btn-danger" onclick="confirmDeleteEntry(${entry.id})">🗑️ 刪除</button>
      <button class="btn btn-primary" onclick="closeView(); openEntryForm(${entry.id})">✏️ 編輯</button>
    `;
  } else {
    actions.innerHTML = '';
  }

  document.getElementById('view-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeView() {
  document.getElementById('view-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────
// Render Entry List
// ─────────────────────────────────────────
function renderEntries() {
  const query = document.getElementById('search-input').value;
  const entries = getAllEntries(query);
  const container = document.getElementById('entry-list');

  document.getElementById('stat-total').textContent = entries.length;
  const authors = [...new Set(entries.map(e => e.username))];
  document.getElementById('stat-authors').textContent = authors.length;
  document.getElementById('stat-latest').textContent =
    entries.length > 0 ? (entries[0].date || entries[0].created_at.slice(0,10)) : '—';

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="icon">📭</div>
        <p>${query ? '找不到符合「' + escHtml(query) + '」的文章' : '還沒有文章，成為第一個發表的人吧！'}</p>
      </div>`;
    return;
  }

  container.innerHTML = entries.map(entry => `
    <div class="entry-card" id="entry-${entry.id}">
      <div class="entry-header" onclick="openView(${entry.id})">
        <div>
          <div class="entry-title">${escHtml(entry.title)}</div>
          <div class="entry-meta">
            <span class="entry-author">👤 ${escHtml(entry.username)}</span>
            <span>📅 ${entry.date || entry.created_at.slice(0,10)}</span>
            <span>🕒 ${entry.created_at.slice(11,16)}</span>
          </div>
        </div>
        <div class="entry-actions" onclick="event.stopPropagation()">
          ${currentUser && currentUser.id === entry.user_id ? `
            <button class="btn btn-secondary" onclick="openEntryForm(${entry.id})">✏️</button>
            <button class="btn btn-danger" onclick="confirmDeleteEntry(${entry.id})">🗑️</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────
// Export / Import
// ─────────────────────────────────────────
function exportDB() {
  if (!db) return;
  const blob = new Blob([db.export()], { type: 'application/x-sqlite3' });
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
      await idbReq('readwrite', DB_KEY, Array.from(db.export()));
      sessionStorage.removeItem(SESSION_KEY);
      currentUser = null;
      updateHeaderAuth();
      renderEntries();
      alert('匯入成功！請重新登入。');
    } catch(err) {
      alert('匯入失敗：' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ─────────────────────────────────────────
// Utils
// ─────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────
// Boot
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

// Modal: click background to close
['auth-modal', 'entry-modal', 'view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'auth-modal') closeAuthModal();
      else if (id === 'entry-modal') closeEntryForm();
      else closeView();
    }
  });
});

// Keyboard: Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAuthModal();
    closeEntryForm();
    closeView();
  }
});
