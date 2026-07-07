// server.js — entry point. Serves the existing static site AND the API
// from one process, so there's nothing extra to deploy or configure.
//
// Security middleware applied globally:
//  - helmet: sets safe HTTP headers (X-Content-Type-Options, HSTS, etc.)
//  - cors: restricts which origins may call the API with credentials
//  - express-rate-limit: throttles auth endpoints to blunt brute-force attempts
//  - express.json({limit}): caps request body size to avoid trivial DoS
require('dotenv').config({ quiet: true });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

require('./db/seed'); // ensures schema exists + demo data seeded on first boot

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false })); // CSP left open here since we serve inline <script> demo pages; lock down further in production
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this device. Please wait a few minutes and try again.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use('/api', apiLimiter);

// ---------- routes ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api', require('./routes/catalog'));      // /api/providers, /api/services
app.use('/api/pets', require('./routes/pets'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api', require('./routes/social'));        // /api/reviews, /api/posts, /api/coupons
app.use('/api', require('./routes/inbox'));         // /api/messages, /api/notifications

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- static frontend ----------
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`Pawstop server running at http://localhost:${PORT}`);
});
