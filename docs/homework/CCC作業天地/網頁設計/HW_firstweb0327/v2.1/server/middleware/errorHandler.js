/**
 * server/middleware/errorHandler.js
 *
 * 統一錯誤處理中介層
 * 所有 route 裡 throw new ApiError(...) 的錯誤都會被這裡攔截
 * 依照 error type 給出對應的 HTTP status code
 */

/**
 * 自訂錯誤類別，攜帶 HTTP status code
 */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * 統一錯誤處理中介層
 * 注意：這個必須放在所有 route 注册 之後
 */
function errorHandler(err, req, res, next) {
  // 記錄到 server console
  console.error(`[${new Date().toISOString()}] ❌ ${req.method} ${req.path} → ${err.status || 500} ${err.message}`);

  // 已經有 headersSent 就交給 Express 預設處理
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const message = status === 500 ? '伺服器內部錯誤，請稍後再試' : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 非同步 route 的 wrapper
 * 把 async 函式裡 throw 的 ApiError 傳給 next()
 *
 * 用法：router.get('/path', asyncWrap(async (req, res) => { throw new ApiError(404, 'Not found'); }));
 */
function asyncWrap(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { ApiError, errorHandler, asyncWrap };
