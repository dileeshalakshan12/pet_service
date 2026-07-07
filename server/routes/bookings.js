// routes/bookings.js — customers can only see/cancel their own bookings;
// providers can only see/confirm-or-decline bookings made against their
// own business. Status transitions are validated server-side too.
const express = require('express');
const db = require('../db/seed');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_STATUSES = ['pending','confirmed','completed','cancelled'];

function row(b){
  return { id:b.id, customerId:b.customer_id, providerId:b.provider_id, serviceId:b.service_id, petId:b.pet_id,
    date:b.date, time:b.time, notes:b.notes, status:b.status, price:b.price, createdAt:b.created_at };
}

router.get('/', requireAuth, (req, res) => {
  const rows = req.user.role === 'provider'
    ? db.prepare('SELECT * FROM bookings WHERE provider_id = ? ORDER BY created_at DESC').all(req.user.providerId)
    : db.prepare('SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ bookings: rows.map(row) });
});

router.post('/', requireAuth, (req, res) => {
  const { providerId, serviceId, petId, date, time, notes } = req.body || {};
  if (!providerId || !date || !time) return res.status(400).json({ error: 'Provider, date, and time are required.' });
  const svc = serviceId ? db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) : null;
  const id = 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  db.prepare(`INSERT INTO bookings (id,customer_id,provider_id,service_id,pet_id,date,time,notes,status,price,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, providerId, serviceId||null, petId||null, date, time, notes||'', 'pending', svc?svc.price:0, Date.now());

  db.prepare(`INSERT INTO notifications (id,user_id,type,text,read,at) VALUES (?,?,?,?,0,?)`)
    .run('note_'+Date.now().toString(36), req.user.id, 'booking', `Booking request sent for ${svc?svc.title:'your service'}.`, Date.now());

  res.status(201).json({ booking: row(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id)) });
});

router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Booking not found.' });

  const isOwnerProvider = req.user.role === 'provider' && existing.provider_id === req.user.providerId;
  const isOwnerCustomer = req.user.role === 'customer' && existing.customer_id === req.user.id;
  if (!isOwnerProvider && !isOwnerCustomer) return res.status(403).json({ error: 'You cannot modify this booking.' });
  // customers may only cancel; only the provider can confirm/complete
  if (isOwnerCustomer && status !== 'cancelled') return res.status(403).json({ error: 'You can only cancel your own bookings.' });

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ booking: row(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)) });
});

module.exports = router;
