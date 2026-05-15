/**
 * server/server.js
 * 網頁日誌系統 v2.0 — Node.js + Express + SQLite
 *
 * 啟動方式：
 *   node server/server.js
 *   npm start
 *
 * 訪問：http://localhost:3000
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// 初始化資料庫（第一次會寫入種子資料）
require('./db');

const authRouter = require('./routes/auth');
const entriesRouter = require('./routes/entries');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────
app.use(cors({
  origin: true,  // 允許所有 origin（開發用）
  credentials: true, // 允許 cookie 跨域
}));
app.use(express.json());      // 解析 JSON body
app.use(cookieParser());      // 解析 cookie

// ── 靜態檔案（public/ = 純前端對照組）───────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ─────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/api/entries', entriesRouter);

// ── 健康檢查 ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 未知路由 → 回傳 public/index.html ───────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── 啟動 ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 網頁日誌系統 v2.0 啟動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   SQLite: ${path.join(__dirname, '..', 'database.sqlite')}\n`);
});
