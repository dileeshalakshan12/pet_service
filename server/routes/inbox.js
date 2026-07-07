// routes/inbox.js — messages between a customer and a provider, and each
// user's own notifications. Every query is scoped to req.user so nobody
// can read another user's inbox by guessing an id.
const express = require('express');
const db = require('../db/seed');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/messages/:peerId', requireAuth, (req, res) => {
  const me = req.user.role === 'provider' ? req.user.providerId : req.user.id;
  const rows = db.prepare('SELECT * FROM messages WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY at ASC')
    .all(me, req.params.peerId, req.params.peerId, me);
  res.json({ messages: rows });
});

router.get('/messages', requireAuth, (req, res) => {
  const me = req.user.role === 'provider' ? req.user.providerId : req.user.id;
  const rows = db.prepare('SELECT * FROM messages WHERE from_id = ? OR to_id = ? ORDER BY at DESC').all(me, me);
  res.json({ messages: rows });
});

router.post('/messages', requireAuth, (req, res) => {
  const { to, text } = req.body || {};
  if (!to || !text || !text.trim()) return res.status(400).json({ error: 'Recipient and message text are required.' });
  const me = req.user.role === 'provider' ? req.user.providerId : req.user.id;
  const id = 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  db.prepare('INSERT INTO messages (id,thread_id,from_id,to_id,text,at) VALUES (?,?,?,?,?,?)')
    .run(id, 't_'+[me,to].sort().join('_'), me, to, text.trim(), Date.now());
  res.status(201).json({ message: db.prepare('SELECT * FROM messages WHERE id = ?').get(id) });
});

router.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY at DESC').all(req.user.id);
  res.json({ notifications: rows });
});

router.patch('/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
