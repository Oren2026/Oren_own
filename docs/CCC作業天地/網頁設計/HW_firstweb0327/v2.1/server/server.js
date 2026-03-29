/**
 * server/server.js — v2.1
 * 網頁日誌系統 Node.js + Express + SQLite
 *
 * v2.1 更新：
 * - Morgan HTTP request logging（每次 request 清楚顯示 method/path/status/time）
 * - 統一錯誤處理中介層（ApiError + errorHandler）
 * - 明確的 API 錯誤訊息
 *
 * 啟動：
 *   node server/server.js
 *   npm start
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// 初始化資料庫（第一次執行時建立 tables + 种子数据）
require('./db');

const authRouter    = require('./routes/auth');
const entriesRouter = require('./routes/entries');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────

// CORS（允許跨域 cookie，開發用）
app.use(cors({ origin: true, credentials: true }));

// 解析 JSON body
app.use(express.json());

// 解析 cookie
app.use(cookieParser());

// Morgan HTTP 日誌（每個 request 都會被記錄在 server console）
// combined = 標準 Apache log 格式（包含 IP、method、path、status、response time 等）
morgan.format('custom', ':method :url :status :res[content-length] - :response-time ms');
app.use(morgan('custom'));

// ── 靜態檔案（public/ = 純前端對照組）───────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ─────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/api/entries', entriesRouter);

// ── 健康檢查 ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 未知 API 路由 → 404 ─────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API 路由不存在' });
});

// ── 未知頁面 → 回傳 public/index.html ───────────────
app.get('*', (req, res) => {
  // 如果不是要求 public 底下的檔案，就回傳 index.html
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// ── 統一錯誤處理（放在所有 route 之後）──────────────
app.use(errorHandler);

// ── 啟動 ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  網頁日誌系統 v2.1 啟動（Morgan 日誌 + 統一錯誤處理）`);
  console.log(`   📡 http://localhost:${PORT}`);
  console.log(`   📁 SQLite: ${path.join(__dirname, '..', 'database.sqlite')}\n`);
});
