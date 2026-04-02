/**
 * server/routes/users.js — v3.0
 *
 * 新增功能：
 * - GET  /api/users/:username          取得個人檔案（含粉絲/追蹤數）
 * - PUT  /api/users/me                 更新自己的檔案（bio, avatar_color, background）
 * - POST /api/users/:username/follow    追蹤
 * - DELETE /api/users/:username/follow 取消追蹤
 * - GET  /api/users/:username/entries  取得該用戶所有文章
 */
const express = require('express');
const db = require('../db');
const { requireAuth, loadUser } = require('../middleware/auth');
const { ApiError, asyncWrap } = require('../middleware/errorHandler');

const router = express.Router();

// ── GET /api/users/:username ───────────────────────
router.get('/:username', loadUser, (req, res) => {
  const { username } = req.params;

  const user = db.prepare(
    'SELECT id, username, bio, avatar_color, background, created_at FROM users WHERE username = ?'
  ).get(username);

  if (!user) throw new ApiError(404, '找不到這個使用者');

  // 粉絲數（有多少人追蹤我）
  const followers = db.prepare(
    'SELECT COUNT(*) as c FROM follows WHERE following_id = ?'
  ).get(user.id).c;

  // 追蹤數（我追蹤多少人）
  const following = db.prepare(
    'SELECT COUNT(*) as c FROM follows WHERE follower_id = ?'
  ).get(user.id).c;

  // 我是否正在追蹤此人
  let isFollowing = false;
  if (req.user) {
    const f = db.prepare(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
    ).get(req.user.id, user.id);
    isFollowing = !!f;
  }

  res.json({
    user: {
      ...user,
      followers_count: followers,
      following_count: following,
      isFollowing,
      isMe: req.user ? req.user.id === user.id : false,
    },
  });
});

// ── PUT /api/users/me ──────────────────────────────
router.put('/me', requireAuth, asyncWrap(async (req, res) => {
  const { bio, avatar_color, background } = req.body;

  db.prepare(
    'UPDATE users SET bio = ?, avatar_color = ?, background = ? WHERE id = ?'
  ).run(
    (bio !== undefined) ? String(bio).slice(0, 200) : '',
    (avatar_color !== undefined) ? String(avatar_color) : '#0f766e',
    (background !== undefined) ? String(background).slice(0, 300) : '',
    req.user.id
  );

  const user = db.prepare(
    'SELECT id, username, bio, avatar_color, background FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({ ok: true, user });
}));

// ── POST /api/users/:username/follow ───────────────
router.post('/:username/follow', requireAuth, asyncWrap(async (req, res) => {
  const { username } = req.params;

  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!target) throw new ApiError(404, '找不到這個使用者');
  if (target.id === req.user.id) throw new ApiError(400, '不能追蹤自己');

  const existing = db.prepare(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, target.id);

  if (existing) throw new ApiError(409, '已經追蹤過了');

  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(
    req.user.id, target.id
  );

  res.status(201).json({ ok: true });
}));

// ── DELETE /api/users/:username/follow ─────────────
router.delete('/:username/follow', requireAuth, asyncWrap(async (req, res) => {
  const { username } = req.params;

  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!target) throw new ApiError(404, '找不到這個使用者');

  const info = db.prepare(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
  ).run(req.user.id, target.id);

  if (!info.changes) throw new ApiError(400, '本來就沒有追蹤');

  res.status(204).end();
}));

// ── GET /api/users/:username/entries ───────────────
router.get('/:username/entries', loadUser, (req, res) => {
  const { username } = req.params;
  const { q, tag } = req.query;

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) throw new ApiError(404, '找不到這個使用者');

  let sql = `
    SELECT e.*, u.username, u.avatar_color
    FROM entries e
    JOIN users u ON e.user_id = u.id
    WHERE e.user_id = ?
  `;
  const params = [user.id];

  if (q) {
    sql += ' AND (e.title LIKE ? OR e.content LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (tag) {
    sql += ' AND e.tags LIKE ?';
    params.push(`%${tag}%`);
  }

  sql += ' ORDER BY e.created_at DESC';

  const entries = db.prepare(sql).all(...params);
  res.json({ entries });
});

module.exports = router;
