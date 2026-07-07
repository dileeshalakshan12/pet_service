// routes/catalog.js — public provider directory & services, with
// provider-owner-only writes (a provider can only edit their own listing).
const express = require('express');
const db = require('../db/seed');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function providerRow(p){
  return { id:p.id, name:p.name, category:p.category, city:p.city, rating:p.rating, reviews:p.reviews,
    experience:p.experience, priceRange:p.price_range, availableToday: !!p.available_today, cover:p.cover,
    about:p.about, hours:p.hours, followers:p.followers, profileViews:p.profile_views, email:p.email };
}
function serviceRow(s){
  return { id:s.id, providerId:s.provider_id, category:s.category, title:s.title, desc:s.desc, price:s.price, duration:s.duration, image:s.image };
}

router.get('/providers', (req, res) => {
  const rows = db.prepare('SELECT * FROM providers ORDER BY rating DESC').all();
  res.json({ providers: rows.map(providerRow) });
});

router.get('/providers/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Provider not found.' });
  db.prepare('UPDATE providers SET profile_views = profile_views + 1 WHERE id = ?').run(req.params.id);
  res.json({ provider: providerRow(row) });
});

router.put('/providers/:id', requireAuth, requireRole('provider','admin'), (req, res) => {
  if (req.user.role === 'provider' && req.user.providerId !== req.params.id){
    return res.status(403).json({ error: "You can only edit your own business profile." });
  }
  const { name, category, city, about, hours, availableToday } = req.body || {};
  db.prepare('UPDATE providers SET name=?, category=?, city=?, about=?, hours=?, available_today=? WHERE id=?')
    .run(name, category, city, about, hours, availableToday ? 1 : 0, req.params.id);
  res.json({ provider: providerRow(db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id)) });
});

router.get('/services', (req, res) => {
  const { providerId, category } = req.query;
  let sql = 'SELECT * FROM services WHERE 1=1';
  const params = [];
  if (providerId){ sql += ' AND provider_id = ?'; params.push(providerId); }
  if (category){ sql += ' AND category = ?'; params.push(category); }
  const rows = db.prepare(sql).all(...params);
  res.json({ services: rows.map(serviceRow) });
});

router.post('/services', requireAuth, requireRole('provider'), (req, res) => {
  const { title, category, price, duration, desc } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!price || price <= 0) return res.status(400).json({ error: 'Price must be greater than 0.' });
  const id = 'svc_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  db.prepare(`INSERT INTO services (id,provider_id,category,title,desc,price,duration,image) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, req.user.providerId, category||'groom', title.trim(), desc||'', Number(price), Number(duration)||30, `https://picsum.photos/seed/${id}/500/320`);
  res.status(201).json({ service: serviceRow(db.prepare('SELECT * FROM services WHERE id = ?').get(id)) });
});

router.put('/services/:id', requireAuth, requireRole('provider'), (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service not found.' });
  if (existing.provider_id !== req.user.providerId) return res.status(403).json({ error: 'You can only edit your own services.' });
  const { title, category, price, duration, desc } = req.body || {};
  db.prepare('UPDATE services SET title=?, category=?, price=?, duration=?, desc=? WHERE id=?')
    .run(title, category, Number(price), Number(duration), desc, req.params.id);
  res.json({ service: serviceRow(db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)) });
});

router.delete('/services/:id', requireAuth, requireRole('provider'), (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service not found.' });
  if (existing.provider_id !== req.user.providerId) return res.status(403).json({ error: 'You can only delete your own services.' });
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
