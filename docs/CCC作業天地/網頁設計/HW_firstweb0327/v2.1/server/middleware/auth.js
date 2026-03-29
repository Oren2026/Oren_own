/**
 * server/middleware/auth.js
 * JWT 驗證中介層
 * - 從 cookie 取出 JWT
 * - 驗證後 attach 到 req.user
 * - 未登入 → 401
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'journal_secret_key_2026';
const COOKIE_NAME = 'journal_token';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * 必須登入才能通過的中介層
 * 使用：router.get('/xxx', requireAuth, handler)
 */
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: '請先登入' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: '登入已過期，請重新登入' });
  }
  req.user = decoded; // { id, username }
  next();
}

/**
 * 選擇性載入用戶（用於公開 API）
 * 無 token 也能通過，只是 req.user 是 undefined
 */
function loadUser(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}

module.exports = { requireAuth, loadUser, signToken, COOKIE_NAME };
