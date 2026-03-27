/**
 * server/server.js — v3.0
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

require('./db');

const authRouter    = require('./routes/auth');
const entriesRouter = require('./routes/entries');
const usersRouter   = require('./routes/users');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
morgan.format('custom', ':method :url :status :res[content-length] - :response-time ms');
app.use(morgan('custom'));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth',    authRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/users',   usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API 路由不存在' });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀  網頁日誌系統 v3.0 啟動（追蹤系統 + 個人頁 + 亮暗版）`);
  console.log(`   📡 http://localhost:${PORT}`);
  console.log(`   📁 SQLite: ${path.join(__dirname, '..', 'database.sqlite')}\n`);
});
