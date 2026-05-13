/**
 * csrf.js — CSRF Token 驗證中介層
 *
 * 使用 HMAC-SHA256 session token，不需要資料庫儲存。
 * Token 格式：userId:timestamp:hmac_hex
 * - 可重複使用（session 內一直有效）
 * - 24小時後過期
 * - 每次 login/register 時更新
 */
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'chatrank-secret-key-change-in-production';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 小時

/**
 * 產生 CSRF Token（供 login/register/refresh 端點呼叫）
 */
function createCsrfToken(userId) {
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return `${userId}:${timestamp}:${sig}`;
}

/**
 * 驗證 CSRF Token（用於 API）
 * Token 從 Header `X-CSRF-Token` 或 Body `csrf_token` 傳來
 */
function requireCsrf(req, res, next) {
  // 如果是 GET/HEAD/OPTIONS，跳過（這些不會修改資料）
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrf_token;
  const userId = req.userId;

  if (!userId) {
    return next();
  }

  if (!token) {
    return res.status(403).json({ error: '缺少 CSRF Token，請重新整理頁面' });
  }

  if (!verifyCsrfToken(token, userId)) {
    return res.status(403).json({ error: 'CSRF Token 無效或已過期，請重新整理頁面' });
  }

  next();
}

/**
 * 驗證 CSRF Token（供 requireCsrf 使用）
 * 格式：userId:timestamp:hmac_hex
 */
function verifyCsrfToken(token, userId) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [tokUserId, ts, sig] = parts;
  const timestamp = parseInt(ts, 10);

  // 檢查 userId 是否匹配
  if (parseInt(tokUserId, 10) !== userId) return false;

  // 檢查是否在有效期內（24小時）
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) return false;

  // 重新計算 HMAC 驗證
  const data = `${tokUserId}:${ts}`;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');

  // timingSafeEqual 防止時序攻擊
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

module.exports = { requireCsrf, createCsrfToken, verifyCsrfToken };
