/**
 * rateLimit.js — 頻率限制中介層
 * 防止暴力破解、灌水留言、濫用 API
 * 實作：簡單的 sliding window counter（記憶體版本）
 */
const WINDOW_MS = 60 * 1000; // 1 分鐘窗口
const MAX_REQUESTS = 60;     // 每窗口最多 60 次

// Map: key → { count, resetAt }
const counters = new Map();

// 每分鐘清理一次過期項目
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of counters.entries()) {
    if (val.resetAt < now) {
      counters.delete(key);
    }
  }
}, WINDOW_MS);

function rateLimit(req, res, next) {
  // 使用 IP + User-Agent 當作識別 key
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `rl:${ip}`;
  const now = Date.now();

  let record = counters.get(key);

  if (!record || record.resetAt < now) {
    // 新窗口
    record = { count: 0, resetAt: now + WINDOW_MS };
    counters.set(key, record);
  }

  record.count++;

  // 設定回應標頭
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - record.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: '請求太頻繁，請稍後再試',
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
  }

  next();
}

/**
 * 更嚴格的限制（用於危險操作：登入、註冊）
 */
const STRICT_MAX = 10;
const STRICT_WINDOW = 60 * 1000;

const strictCounters = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of strictCounters.entries()) {
    if (val.resetAt < now) strictCounters.delete(key);
  }
}, STRICT_WINDOW);

function strictRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `strict:${ip}`;
  const now = Date.now();

  let record = strictCounters.get(key);
  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + STRICT_WINDOW };
    strictCounters.set(key, record);
  }

  record.count++;
  res.setHeader('X-RateLimit-Limit', STRICT_MAX);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, STRICT_MAX - record.count));

  if (record.count > STRICT_MAX) {
    return res.status(429).json({
      error: '操作太頻繁，請稍後再試',
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
  }

  next();
}

module.exports = { rateLimit, strictRateLimit };
