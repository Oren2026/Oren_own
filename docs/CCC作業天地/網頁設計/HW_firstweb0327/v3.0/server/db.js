/**
 * server/db.js — v3.0
 *
 * v3.0 新增：
 * - users 表新增 bio, avatar_color, background 欄位
 * - follows 表（follower 追蹤 following）
 * - 种子数据同步更新
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');

// ── 建立 Table ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    password_hash  TEXT    NOT NULL,
    bio           TEXT    DEFAULT '',
    avatar_color  TEXT    DEFAULT '#0f766e',
    background    TEXT    DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT    NOT NULL,
    content    TEXT,
    date       TEXT,
    tags       TEXT    DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id  INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// ── 种子資料 ────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  console.log('📦 寫入種子資料…');

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, bio, avatar_color) VALUES (?, ?, ?, ?)'
  );
  const insertEntry = db.prepare(
    'INSERT INTO entries (user_id, title, content, date, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertFollow = db.prepare(
    'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)'
  );

  const users = [
    { u: 'admin', p: '1234', bio: '系統管理者，喜歡研究新技術。', color: '#2563eb' },
    { u: '小美',   p: '1111', bio: '雲林在地人，業餘生態觀察者。', color: '#db2777' },
    { u: '阿偉',   p: '2222', bio: 'TDK 機器人參賽者，ESP32 愛好者。', color: '#d97706' },
    { u: '妮妮',   p: '3334', bio: '對能源和 AI 有興趣的學生。', color: '#7c3aed' },
  ];

  const entries = [
    [1, '📢 系統正式上線公告', '經過一個月的開發，終於把這個雲林地方日誌系統做出來了！', '2026-03-20', '系統公告,雲林', '2026-03-20 10:00:00'],
    [1, '🔬 SQLite 原理淺談', 'SQLite 是一個嵌入式資料庫，沒有獨立的伺服器行程，資料庫本身是一個檔案。', '2026-03-22', '技術,SQLite,資料庫', '2026-03-22 09:30:00'],
    [2, '🌾 成龍濕地半日遊', '今天天氣很好，下午骑车去成龍濕地繞了一圈，看到了很多水鳥。', '2026-03-15', '雲林,生態,遊記', '2026-03-15 16:20:00'],
    [2, '💻 CCC作業感想', '這次的網頁日誌作業做得有點辛苦，但也學到很多。', '2026-03-24', '心得,雲林,技術', '2026-03-24 21:10:00'],
    [2, '🏭 虎尾糖廠之旅', '難得有機會進去糖廠內部參觀，聽說這裡是全台唯一還在運作的糖廠。', '2026-03-18', '雲林,文化,遊記', '2026-03-18 14:00:00'],
    [3, '🤖 TDK 機器人啟動了！', '經過三周的組裝，終於把機器人的硬體部分完成了！', '2026-03-19', 'TDK,機器人,ESP32', '2026-03-19 23:45:00'],
    [3, '🦷 爪子機構規劃', '目前最頭痛的是爪子的夾取機構，目標是一次能夾起文蛤。', '2026-03-21', 'TDK,機構設計,機器人', '2026-03-21 08:20:00'],
    [4, '♻️ 淨灘日誌', '參加了麥仔岸淨灘活動，一共清了一百多公斤的垃圾。', '2026-03-16', '環保,淨灘,心得', '2026-03-16 12:30:00'],
    [4, '💭 我的夢想', '最近在想要不要研究所去讀 AI 或機器人相關的領域。', '2026-03-23', '夢想,心得,AI', '2026-03-23 22:00:00'],
    [4, '🚗 遙控車初體驗', '第一次用 ESP32 + WiFi 控制遙控車，延遲大約 50ms，還可以接受。', '2026-03-25', 'ESP32,遙控,TDK', '2026-03-25 19:15:00'],
  ];

  // 寫入使用者
  const txUser = db.transaction(() => {
    for (const { u, p, bio, color } of users) {
      insertUser.run(u, bcrypt.hashSync(p, 10), bio, color);
    }
  });
  txUser();

  // 寫入文章
  const txEntry = db.transaction(() => {
    for (const e of entries) insertEntry.run(...e);
  });
  txEntry();

  // 預設關注關係：admin 追蹤 小美、阿偉，小美 追蹤 妮妮
  const txFollow = db.transaction(() => {
    insertFollow.run(1, 2); // admin → 小美
    insertFollow.run(1, 3); // admin → 阿偉
    insertFollow.run(2, 4); // 小美 → 妮妮
    insertFollow.run(3, 1); // 阿偉 → admin
    insertFollow.run(4, 2); // 妮妮 → 小美
  });
  txFollow();

  console.log('✅ 種子資料寫入完成（4 users, 10 entries, 5 follows）');
} else {
  console.log(`ℹ️  資料庫已有 ${userCount.c} 位使用者，跳過種子`);
}

module.exports = db;
