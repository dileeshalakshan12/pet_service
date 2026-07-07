// routes/auth.js — registration & login.
// Security measures in this file:
//  - passwords are hashed with bcrypt (10 salt rounds), never stored in plaintext
//  - login attempts are rate-limited per IP (express-rate-limit, applied in server.js)
//  - repeated failed logins on one account trigger a temporary lockout
//  - all inputs are validated server-side (never trust client-side validation alone)
//  - SQL is fully parameterized — user input is never concatenated into a query string
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/seed');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function signToken(user){
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, providerId: user.provider_id || null, avatarText: user.avatar_text },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user){
  return { id: user.id, name: user.name, email: user.email, role: user.role, providerId: user.provider_id || null, avatarText: user.avatar_text };
}

router.post('/register', (req, res) => {
  const { name, email, password, role, category, city } = req.body || {};

  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!['customer','provider'].includes(role)) return res.status(400).json({ error: 'Invalid account type.' });
  // Note: 'admin' is intentionally not a selectable option here — admin accounts
  // are provisioned directly in the database, never through public signup.

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const id = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const passwordHash = bcrypt.hashSync(password, 10);
  const initials = name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  let providerId = null;

  if (role === 'provider'){
    providerId = 'prov_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
    db.prepare(`INSERT INTO providers (id,name,category,city,rating,reviews,experience,price_range,available_today,cover,about,hours,followers,profile_views,email) VALUES (?,?,?,?,0,0,0,'$',0,?,?,?,0,0,?)`).run(
      providerId, name.trim(), category || 'groom', city || 'Colombo',
      `https://picsum.photos/seed/${providerId}/600/240`,
      `${name.trim()} is a new provider on Pawstop.`, 'Not set yet', email.toLowerCase()
    );
  }

  db.prepare(`INSERT INTO users (id,name,email,password_hash,role,provider_id,avatar_text,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, name.trim(), email.toLowerCase(), passwordHash, role, providerId, initials, Date.now());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!password) return res.status(400).json({ error: 'Password is required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  // Same generic error whether the email exists or not — avoids leaking
  // which emails are registered.
  const genericError = { error: 'Incorrect email or password.' };
  if (!user) return res.status(401).json(genericError);

  if (user.locked_until && user.locked_until > Date.now()){
    const minutes = Math.ceil((user.locked_until - Date.now()) / 60000);
    return res.status(423).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid){
    const attempts = (user.failed_login_count || 0) + 1;
    const lockedUntil = attempts >= LOCK_THRESHOLD ? Date.now() + LOCK_DURATION_MS : null;
    db.prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
    if (lockedUntil) return res.status(423).json({ error: 'Too many failed attempts. Account temporarily locked for 15 minutes.' });
    return res.status(401).json(genericError);
  }

  db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?').run(user.id);
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// used by the front-end on load to check whether a stored token is still valid
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

router.put('/me', require('../middleware/auth').requireAuth, (req, res) => {
  const { name, email } = req.body || {};
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), req.user.id);
  if (clash) return res.status(409).json({ error: 'That email is already in use by another account.' });

  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), email.toLowerCase(), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const token = signToken(user); // re-sign so the JWT payload reflects the new name/email
  res.json({ token, user: publicUser(user) });
});

module.exports = router;
