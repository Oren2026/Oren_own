/**
 * server/routes/entries.js
 * 文章 CRUD API
 * GET  /api/entries          — 列表（支援 ?author=&q=）
 * POST /api/entries          — 新增（需登入）
 * PUT  /api/entries/:id     — 編輯（需登入，且為作者）
 * DELETE /api/entries/:id   — 刪除（需登入，且為作者）
 */
const express = require('express');
const db = require('../db');
const { requireAuth, loadUser } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/entries ────────────────────────────────
router.get('/', loadUser, (req, res) => {
  const { author, q } = req.query;

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

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY e.created_at DESC';

  const entries = db.prepare(sql).all(...params);
  res.json({ entries });
});

// ── POST /api/entries ───────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { title, content, date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '請填寫標題' });
  }

  const info = db.prepare(
    'INSERT INTO entries (user_id, title, content, date) VALUES (?, ?, ?, ?)'
  ).run(
    req.user.id,
    title.trim(),
    content || '',
    date || new Date().toISOString().slice(0, 10)
  );

  const entry = db.prepare(`
    SELECT e.*, u.username
    FROM entries e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(info.lastInsertRowid);

  res.json({ ok: true, entry });
});

// ── PUT /api/entries/:id ───────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  // 確認文章存在且屬於當前用戶
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) return res.status(404).json({ error: '文章不存在' });
  if (entry.user_id !== req.user.id) {
    return res.status(403).json({ error: '沒有權限編輯這篇文章' });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '請填寫標題' });
  }

  db.prepare(`
    UPDATE entries
    SET title = ?, content = ?, date = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(title.trim(), content || '', date || null, id);

  const updated = db.prepare(`
    SELECT e.*, u.username
    FROM entries e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(id);

  res.json({ ok: true, entry: updated });
});

// ── DELETE /api/entries/:id ───────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!entry) return res.status(404).json({ error: '文章不存在' });
  if (entry.user_id !== req.user.id) {
    return res.status(403).json({ error: '沒有權限刪除這篇文章' });
  }

  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
