/**
 * server/routes/auth.js — v2.1
 *
 * v2.1 更新：
 * - 所有 handler 改用 async/await + asyncWrap
 * - 錯誤統一拋 ApiError，由 errorHandler 中介層處理
 * - bcrypt.compareSync → bcrypt.compare（非同步版）
 * - 拿掉每個 handler 自己的 try/catch
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, signToken, COOKIE_NAME } = require('../middleware/auth');
const { ApiError, asyncWrap } = require('../middleware/errorHandler');

const router = express.Router();

// ── POST /api/auth/register ─────────────────────────
router.post('/register', asyncWrap(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    throw new ApiError(400, '請填寫帳號和密碼');
  if (username.trim().length < 2)
    throw new ApiError(400, '帳號至少要 2 個字元');
  if (password.length < 4)
    throw new ApiError(400, '密碼至少要 4 個字元');

  // 檢查帳號是否重複
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) throw new ApiError(409, '帳號已有人使用');

  // 寫入新使用者（bcrypt 非同步）
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).run(username.trim(), hash);

  // 自動登入
  const token = signToken({ id: info.lastInsertRowid, username: username.trim() });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ ok: true, user: { id: info.lastInsertRowid, username: username.trim() } });
}));

// ── POST /api/auth/login ────────────────────────────
router.post('/login', asyncWrap(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    throw new ApiError(400, '請填寫帳號和密碼');

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) throw new ApiError(401, '帳號或密碼錯誤');

  // bcrypt compare（非同步）
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new ApiError(401, '帳號或密碼錯誤');

  const token = signToken({ id: user.id, username: user.username });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true, user: { id: user.id, username: user.username } });
}));

// ── POST /api/auth/logout ───────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ── GET /api/auth/me ───────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
