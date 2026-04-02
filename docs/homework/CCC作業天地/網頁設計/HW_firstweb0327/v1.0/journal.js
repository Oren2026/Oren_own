/**
 * 網頁日誌系統 - journal.js
 * 使用 sql.js（WebAssembly SQLite）作為本地資料庫
 * 資料保存在 IndexedDB 中，關閉視窗不會消失
 */

let db = null;
let currentViewId = null;
let DB_KEY = 'journal_sqlite_db_v1';

// ─────────────────────────────────────────
// Init
// ─────────────────────────────────────────
async function init() {
  const status = document.getElementById('db-status');
  try {
    status.textContent = '⏳ 初始化中...';
    status.className = 'saving';

    // 初始化 sql.js
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    // 嘗試從 IndexedDB 讀取既有資料庫
    db = await loadDB(SQL);

    // 建立資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL,
        content    TEXT,
        date       TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `);

    saveDB(); // 第一次建立後立即保存
    status.textContent = '✅ 已載入';
    status.className = 'saved';

    renderList();
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
    const req = val === undefined
      ? indexedDB.open('journalDB', 1).result.transaction('store').objectStore('store').get(key)
      : indexedDB.open('journalDB', 1).onupgradeneeded = e => {
          e.target.result.createObjectStore('store');
        } || indexedDB.open('journalDB', 1).result.transaction('store', 'readwrite').objectStore('store').put(val, key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function loadDB(SQL) {
  try {
    const saved = await idbKeyVal(DB_KEY);
    if (saved) {
      const data = new Uint8Array(saved);
      return new SQL.Database(data);
    }
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
    console.error('Save error:', e);
  }
}

// ─────────────────────────────────────────
// CRUD 操作
// ─────────────────────────────────────────
function getAll(query = '') {
  if (!db) return [];
  const q = query.trim();
  let stmt;
  if (q === '') {
    stmt = db.prepare('SELECT * FROM entries ORDER BY created_at DESC');
  } else {
    stmt = db.prepare(
      "SELECT * FROM entries WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC"
    );
    const likeQ = `%${q}%`;
    stmt.bind([likeQ, likeQ]);
  }
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function insertEntry(title, content, date) {
  if (!db) return;
  const d = date || new Date().toISOString().split('T')[0];
  db.run(
    'INSERT INTO entries (title, content, date) VALUES (?, ?, ?)',
    [title, content, d]
  );
  saveDB();
  renderList();
}

function updateEntry(id, title, content, date) {
  if (!db) return;
  db.run(
    "UPDATE entries SET title=?, content=?, date=?, updated_at=datetime('now','localtime') WHERE id=?",
    [title, content, date || null, id]
  );
  saveDB();
  renderList();
}

function deleteEntryById(id) {
  if (!db) return;
  db.run('DELETE FROM entries WHERE id=?', [id]);
  saveDB();
  renderList();
}

function clearAllEntries() {
  if (!db) return;
  db.run('DELETE FROM entries');
  saveDB();
  renderList();
}

// ─────────────────────────────────────────
// 渲染
// ─────────────────────────────────────────
function renderList() {
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
  const body = document.getElementById(`body-${id}`);
  body.classList.toggle('open');
}

function openForm(id) {
  const modal = document.getElementById('form-modal');
  const titleInput = document.getElementById('entry-title');
  const dateInput = document.getElementById('entry-date');
  const contentInput = document.getElementById('entry-content');
  const editId = document.getElementById('edit-id');
  const titleEl = document.getElementById('form-title');

  if (id) {
    // 編輯模式
    const rows = getAll().filter(r => r.id === id);
    if (rows.length === 0) return;
    const row = rows[0];
    editId.value = id;
    titleEl.textContent = '✏️ 編輯日誌';
    titleInput.value = row.title;
    dateInput.value = row.date || '';
    contentInput.value = row.content || '';
  } else {
    // 新增模式
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

  if (!title) {
    alert('請輸入標題');
    return;
  }

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

// 檢視詳情（從 card 的「打開」狀態讀取內容）
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

// ─────────────────────────────────────────
// 匯出 / 匯入
// ─────────────────────────────────────────
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

function importDB(file) {
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
      renderList();
      document.getElementById('db-status').textContent = '✅ 已匯入';
      alert('資料庫匯入成功！');
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

// Modal 點背景關閉
['form-modal', 'view-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'form-modal') closeForm();
      else closeView();
    }
  });
});

// ESC 關閉
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeForm();
    closeView();
  }
});
