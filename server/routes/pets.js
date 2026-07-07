// routes/pets.js — every route is scoped to req.user.id, so one customer
// can never read or edit another customer's pet records via a guessed id.
const express = require('express');
const db = require('../db/seed');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function petRow(p){
  return { id:p.id, ownerId:p.owner_id, name:p.name, species:p.species, breed:p.breed, age:p.age, gender:p.gender,
    weight:p.weight, vaccinated:p.vaccinated, allergies:p.allergies, notes:p.notes, photoEmoji:p.photo_emoji };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM pets WHERE owner_id = ?').all(req.user.id);
  res.json({ pets: rows.map(petRow) });
});

router.post('/', requireAuth, (req, res) => {
  const { name, species, breed, age, gender, weight, vaccinated, allergies, notes } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Please give your pet a name." });
  const id = 'pet_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const emoji = species === 'Cat' ? '🐈' : species === 'Bird' ? '🐦' : species === 'Dog' ? '🐕' : '🐾';
  db.prepare(`INSERT INTO pets (id,owner_id,name,species,breed,age,gender,weight,vaccinated,allergies,notes,photo_emoji) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, name.trim(), species||'Dog', breed||'', Number(age)||0, gender||'Male', weight||'', vaccinated||'Up to date', allergies||'None known', notes||'', emoji);
  res.status(201).json({ pet: petRow(db.prepare('SELECT * FROM pets WHERE id = ?').get(id)) });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pet not found.' });
  if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own pets.' });
  const { name, species, breed, age, gender, weight, vaccinated, allergies, notes } = req.body || {};
  const emoji = species === 'Cat' ? '🐈' : species === 'Bird' ? '🐦' : species === 'Dog' ? '🐕' : '🐾';
  db.prepare(`UPDATE pets SET name=?, species=?, breed=?, age=?, gender=?, weight=?, vaccinated=?, allergies=?, notes=?, photo_emoji=? WHERE id=?`)
    .run(name, species, breed, Number(age)||0, gender, weight, vaccinated, allergies, notes, emoji, req.params.id);
  res.json({ pet: petRow(db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pet not found.' });
  if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own pets.' });
  db.prepare('DELETE FROM pets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
