/**
 * server/db.js — SQLite 資料庫初始化
 * 使用 better-sqlite3（Node.js 原生 SQLite，同步 API）
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

const db = new Database(DB_PATH);

// 啟用 foreign key
db.pragma('foreign_keys = ON');

// ── 建立 Table ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    UNIQUE NOT NULL,
    password_hash TEXT   NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  )
`);

db.exec(`
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

// ── 種子資料（只有 users 表格是空的時候才寫入）─────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  console.log('📦 寫入種子資料…');

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );
  const insertEntry = db.prepare(
    'INSERT INTO entries (user_id, title, content, date, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const seedUsers = [
    ['admin', bcrypt.hashSync('1234', 10)],
    ['小美',   bcrypt.hashSync('1111', 10)],
    ['阿偉',   bcrypt.hashSync('2222', 10)],
    ['妮妮',   bcrypt.hashSync('3334', 10)],
  ];
  const insertUsers = db.transaction(() => {
    for (const [u, h] of seedUsers) insertUser.run(u, h);
  });
  insertUsers();

  const seedEntries = [
    [1, '📢 系統正式上線公告', '經過一個月的開發，終於把這個雲林地方日誌系統做出來了！初衷是希望能有一個地方讓大家在日常記錄生活的點滴，無論是農業觀察、社區活動，或是單純的心情抒發。', '2026-03-20', '2026-03-20 10:00:00'],
    [1, '🔬 SQLite 原理淺談', 'SQLite 是一個嵌入式資料庫，沒有獨立的伺服器行程，資料庫本身是一個檔案。這讓它非常適合中小型應用，淘寶、Skype、Airbnb 底層都是用它。原理上，所有資料操作都在同一個行程內完成，速度很快。', '2026-03-22', '2026-03-22 09:30:00'],
    [2, '🌾 成龍濕地半日遊', '今天天氣很好，下午骑车去成龍濕地繞了一圈，看到了很多水鳥。生態真的很不錯，難怪這裡是雲林重要的濕地保護區。建議大家有空可以去走走，注意不要帶零食垃圾。', '2026-03-15', '2026-03-15 16:20:00'],
    [2, '💻 CCC作業感想', '這次的網頁日誌作業做得有點辛苦，但也學到很多。從一開始的純 JS 到後來加入 SQLite，感受到資料管理的重要 性。SQL.js 在前端也可以跑 SQLite，很神奇的體驗。', '2026-03-24', '2026-03-24 21:10:00'],
    [2, '🏭 虎尾糖廠之旅', '難得有機會進去糖廠內部參觀，聽說這裡是全台唯一還在運作的糖廠。空氣中真的有淡淡的甜味，機械運作的聲音很有歷史感。很推薦可以報名導覽，認識在地的糖業文化。', '2026-03-18', '2026-03-18 14:00:00'],
    [3, '🤖 TDK 機器人啟動了！', '經過三周的組裝，終於把機器人的硬體部分完成了！用的是 ESP32 搭配 L298N 馬達驅動，等著下週開始寫控制程式。希望能在五月的比賽前完成所有關卡的任務。', '2026-03-19', '2026-03-19 23:45:00'],
    [3, '🦷 爪子機構規劃', '目前最頭痛的是爪子的夾取機構，目標是一次能夾起文蛤，還要能在水中運作。考虑用氣壓驅動，但擔心氣泵太重會影響機器人平衡。明天去找加工廠討論一下鋁擠型的可行性。', '2026-03-21', '2026-03-21 08:20:00'],
    [4, '♻️ 淨灘日誌', '參加了麥仔岸淨灘活動，一共清了一百多公斤的垃圾。海洋塑膠問題比我想像的嚴重太多了，很多都是微塑膠幾乎無法撿拾。以後要更注意自己的生活用品選擇。', '2026-03-16', '2026-03-16 12:30:00'],
    [4, '💭 我的夢想', '最近在想要不要研究所去讀 AI 或機器人相關的領域。對能源和自動化都有興趣，但還不確定哪個方向更适合自己。三十歲拿到博士是我的目標，要抓緊時間了。', '2026-03-23', '2026-03-23 22:00:00'],
    [4, '🚗 遙控車初體驗', '第一次用 ESP32 + WiFi 控制遙控車，延遲大約 50ms，還可以接受。重點是可以在瀏覽器裡控制，未來想改成手機遙控。這是 TDK 關卡的延伸練習。', '2026-03-25', '2026-03-25 19:15:00'],
  ];

  const insertEntries = db.transaction(() => {
    for (const e of seedEntries) insertEntry.run(...e);
  });
  insertEntries();

  console.log('✅ 種子資料寫入完成（4 users, 10 entries）');
} else {
  console.log(`ℹ️  資料庫已有 ${userCount.c} 位使用者，跳過種子`);
}

module.exports = db;
