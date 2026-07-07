// routes/uploads.js — image uploads for the article editor (cover image +
// in-body images). Security measures:
//  - only image mimetypes are accepted (checked server-side, not just by file extension)
//  - file size capped at 5MB
//  - filenames are regenerated server-side (never trust a client-supplied filename)
//  - requires authentication, so anonymous users can't use this as an open upload endpoint
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  }
});

const ALLOWED = new Set(['image/png','image/jpeg','image/jpg','image/webp','image/gif']);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error('Only PNG, JPEG, WEBP, or GIF images are allowed.'));
    cb(null, true);
  }
});

router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image received.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
