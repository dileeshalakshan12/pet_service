// routes/social.js — public reviews & promo posts, provider-owned coupons.
const express = require('express');
const db = require('../db/seed');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/* ---------- reviews ---------- */
router.get('/reviews', (req, res) => {
  const { providerId } = req.query;
  const rows = providerId
    ? db.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY date DESC').all(providerId)
    : db.prepare('SELECT * FROM reviews ORDER BY date DESC').all();
  res.json({ reviews: rows });
});

router.post('/reviews', requireAuth, (req, res) => {
  const { providerId, rating, text } = req.body || {};
  if (!providerId) return res.status(400).json({ error: 'providerId is required.' });
  const r = Number(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  if (!text || text.trim().length < 3) return res.status(400).json({ error: 'Please write a short review.' });
  const id = 'rev_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  db.prepare('INSERT INTO reviews (id,provider_id,author,rating,text,date,likes) VALUES (?,?,?,?,?,?,0)')
    .run(id, providerId, req.user.name, r, text.trim(), Date.now());

  const revs = db.prepare('SELECT rating FROM reviews WHERE provider_id = ?').all(providerId);
  const avg = revs.reduce((s,x)=>s+x.rating,0) / revs.length;
  db.prepare('UPDATE providers SET rating = ?, reviews = ? WHERE id = ?').run(avg.toFixed(1), revs.length, providerId);

  res.status(201).json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) });
});

/* ---------- marketplace promo posts ---------- */
function postRow(p){
  return { id:p.id, providerId:p.provider_id, title:p.title, desc:p.desc, image:p.image, category:p.category,
    price:p.price, promo: !!p.promo, tags: p.tags ? JSON.parse(p.tags) : [], likes:p.likes, status:p.status, createdAt:p.created_at };
}

router.get('/posts', (req, res) => {
  const { providerId, all } = req.query;
  let sql = 'SELECT * FROM posts WHERE 1=1';
  const params = [];
  if (providerId){ sql += ' AND provider_id = ?'; params.push(providerId); }
  if (all !== '1') sql += " AND status = 'published'";
  sql += ' ORDER BY created_at DESC';
  res.json({ posts: db.prepare(sql).all(...params).map(postRow) });
});

router.post('/posts', requireAuth, requireRole('provider'), (req, res) => {
  const { title, desc, image, category, price, promo, tags, status } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  const id = 'post_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  db.prepare(`INSERT INTO posts (id,provider_id,title,desc,image,category,price,promo,tags,likes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`)
    .run(id, req.user.providerId, title.trim(), desc||'', image||`https://picsum.photos/seed/${id}/600/380`, category||'groom', Number(price)||0, promo?1:0, JSON.stringify((tags||[]).slice(0,8)), status==='draft'?'draft':'published', Date.now());
  res.status(201).json({ post: postRow(db.prepare('SELECT * FROM posts WHERE id = ?').get(id)) });
});

router.post('/posts/:id/like', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found.' });
  const { liked } = req.body || {};
  db.prepare('UPDATE posts SET likes = likes + ? WHERE id = ?').run(liked ? 1 : -1, req.params.id);
  res.json({ post: postRow(db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)) });
});

/* ---------- coupons ---------- */
router.get('/coupons', requireAuth, requireRole('provider'), (req, res) => {
  res.json({ coupons: db.prepare('SELECT * FROM coupons WHERE provider_id = ?').all(req.user.providerId) });
});

router.post('/coupons', requireAuth, requireRole('provider'), (req, res) => {
  const { code, discount, expires } = req.body || {};
  if (!code || !code.trim()) return res.status(400).json({ error: 'Coupon code is required.' });
  const d = Number(discount);
  if (!d || d < 1 || d > 90) return res.status(400).json({ error: 'Discount must be between 1 and 90 percent.' });
  const id = 'cp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  db.prepare('INSERT INTO coupons (id,provider_id,code,discount,expires) VALUES (?,?,?,?,?)')
    .run(id, req.user.providerId, code.trim().toUpperCase(), d, expires||null);
  res.status(201).json({ coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) });
});

router.delete('/coupons/:id', requireAuth, requireRole('provider'), (req, res) => {
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Coupon not found.' });
  if (existing.provider_id !== req.user.providerId) return res.status(403).json({ error: 'You can only delete your own coupons.' });
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
