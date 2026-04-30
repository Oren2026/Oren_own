/**
 * auth.js — JWT 驗證中介層
 * 資安重點：
 * - JWT 存在 HTTP-only Cookie，JavaScript 無法讀取（防 XSS 盜取 Token）
 * - SameSite=Strict 防止 CSRF 攻擊
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'chatrank-secret-key-change-in-production';
const COOKIE_NAME = 'chatrank_token';

function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * 必須登入才能存取
 * 從 HTTP-only Cookie 讀取 JWT
 */
function requireAuth(req, res, next) {
  // 從 Cookie 讀取（HTTP-only，JavaScript 無法讀取）
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: '請先登入' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '登入已過期，請重新登入' });
  }

  req.userId = payload.userId;
  req.username = payload.username;
  // 附加 userRole（從 DB 查，不從 JWT）
  const user = db.getUserById(payload.userId);
  req.userRole = user ? (user.role || 'user') : 'user';
  next();
}

/**
 * 選項性認證：如果有 Token 就解析，沒有就繼續
 */
function optionalAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.username = payload.username;
    }
  }
  next();
}

/**
 * 設定登入 Cookie（HTTP-only + SameSite=Strict）
 */
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,      // JavaScript 無法讀取（防 XSS）
    sameSite: 'strict',  // 嚴格模式，完全防止 CSRF
    secure: false,       // 本地開發 false，部署時要 true（需要 HTTPS）
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    path: '/',
  });
}

/**
 * 清除登入 Cookie
 */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
  });
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
};
