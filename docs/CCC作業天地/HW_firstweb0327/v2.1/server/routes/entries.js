/**
 * server/routes/entries.js — v2.1
 *
 * v2.1 更新：
 * - asyncWrap 包裝所有非同步 handler
 * - 錯誤統一拋 ApiError（400 / 401 / 403 / 404）
 * - 404/403 錯誤訊息更明確
 * - DELETE /api/entries/:id → 204 No Content 成功回應
 */
const express = require('express');
const db = require('../db');
const { requireAuth, loadUser } = require('../middleware/auth');
const { ApiError, asyncWrap } = require('../middleware/errorHandler');

const router = express.Router();

// ── GET /api/entries ───────────────────────────────
router.get('/', loadUser, (req, res) => {
  // v2.2: pagination + tag filter
  const { author, q, tag, page = 1, limit = 10 } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset   = (pageNum - 1) * limitNum;

  let sql = `
    SELECT e.*, u.username
    FROM entries e
    JOIN users u ON e.user_id = u.id
  `;
  const conditions = [];
  const params = [];

  if (author) {
    conditions.push('u.username = ?');
    params.push(author);
  }
  if (q) {
    conditions.push('(e.title LIKE ? OR e.content LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (tag) {
    conditions.push("',' || e.tags || ',' LIKE ?");
    params.push(`%,${tag},%`);
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY e.created_at DESC';

  // 總數（不帶 LIMIT/OFFSET）
  const countSql = sql.replace(/SELECT e\.\*, u\.username/, 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  // 分頁
  const entries = db.prepare(sql + ' LIMIT ? OFFSET ?').all(...params, limitNum, offset);

  const totalPages = Math.ceil(total / limitNum);
  res.json({ entries, total, page: pageNum, limit: limitNum, totalPages });
});

// ── POST /api/entries ───────────────────────────────
router.post('/', requireAuth, asyncWrap(async (req, res) => {
  // v2.2: +tags
  const { title, content, date, tags } = req.body;

  if (!title || !title.trim())
    throw new ApiError(400, '請填寫標題');

  // tags: comma-separated string, stored as "tag1,tag2,tag3"
  const tagsStr = tags ? String(tags).trim() : '';

  const info = db.prepare(
    'INSERT INTO entries (user_id, title, content, tags, date) VALUES (?, ?, ?, ?, ?)'
  ).run(
    req.user.id,
    title.trim(),
    content || '',
    tagsStr,
    date || new Date().toISOString().slice(0, 10)
  );

  const entry = db.prepare(`
    SELECT e.*, u.username
    FROM entries e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json({ ok: true, entry });
}));

// ── PUT /api/entries/:id ────────────────────────────
router.put('/:id', requireAuth, asyncWrap(async (req, res) => {
  // v2.2: +tags
  const { id } = req.params;
  const { title, content, date, tags } = req.body;

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) throw new ApiError(404, '文章不存在');
  if (entry.user_id !== req.user.id) throw new ApiError(403, '沒有權限編輯這篇文章');

  if (!title || !title.trim()) throw new ApiError(400, '請填寫標題');

  const tagsStr = tags ? String(tags).trim() : '';

  db.prepare(`
    UPDATE entries
    SET title=?, content=?, tags=?, date=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(title.trim(), content || '', tagsStr, date || null, id);

  const updated = db.prepare(`
    SELECT e.*, u.username
    FROM entries e
    JOIN users u ON e.user_id = u.id
    WHERE e.id=?
  `).get(id);

  res.json({ ok: true, entry: updated });
}));

// ── DELETE /api/entries/:id ────────────────────────
router.delete('/:id', requireAuth, asyncWrap(async (req, res) => {
  const { id } = req.params;

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) throw new ApiError(404, '文章不存在');
  if (entry.user_id !== req.user.id) throw new ApiError(403, '沒有權限刪除這篇文章');

  db.prepare('DELETE FROM entries WHERE id = ?').run(id);

  // 204 No Content 表示刪除成功且無回傳內容
  res.status(204).end();
}));

module.exports = router;
