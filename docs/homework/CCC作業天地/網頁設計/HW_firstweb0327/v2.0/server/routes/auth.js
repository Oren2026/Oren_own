/**
 * server/routes/auth.js
 * 認證相關 API
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, signToken, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ─────────────────────────
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  // 參數驗證
  if (!username || !password) {
    return res.status(400).json({ error: '請填寫帳號和密碼' });
  }
  if (username.trim().length < 2) {
    return res.status(400).json({ error: '帳號至少要 2 個字元' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: '密碼至少要 4 個字元' });
  }

  // 檢查帳號是否重複
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(409).json({ error: '帳號已有人使用' });
  }

  // 寫入新使用者
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).run(username.trim(), hash);

  // 自動登入
  const token = signToken({ id: info.lastInsertRowid, username: username.trim() });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,    // JS 無法讀取（防 XSS）
    sameSite: 'strict', // 防止 CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  });

  res.json({ ok: true, user: { id: info.lastInsertRowid, username: username.trim() } });
});

// ── POST /api/auth/login ────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '請填寫帳號和密碼' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }

  const token = signToken({ id: user.id, username: user.username });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

// ── POST /api/auth/logout ───────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ── GET /api/auth/me ────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
