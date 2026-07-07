// routes/articles.js — the blog CMS. Public GET returns published articles
// only; every write (create/update/delete/publish) requires an admin-role
// JWT. Rich-text HTML from the editor is run through sanitize-html before
// it's stored or ever returned to a browser, so a malicious <script> tag
// pasted into the editor can't execute for other visitors (stored XSS).
const express = require('express');
const sanitizeHtml = require('sanitize-html');
const db = require('../db/seed');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function slugify(title){
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function uniqueSlug(base, excludeId){
  let slug = base || 'article';
  let i = 1;
  while (true){
    const row = excludeId
      ? db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(slug, excludeId)
      : db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
    if (!row) return slug;
    slug = `${base}-${++i}`;
  }
}

const SANITIZE_OPTS = {
  allowedTags: ['h2','h3','h4','p','strong','em','u','a','ul','ol','li','blockquote','img','br','span','figure','figcaption'],
  allowedAttributes: { a: ['href','target','rel'], img: ['src','alt'], span: ['style'] },
  allowedStyles: { span: { color: [/^#[0-9a-fA-F]{3,6}$/] } },
  allowedSchemes: ['http','https','data'],
  transformTags: { 'a': sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) }
};

function serialize(a){
  return {
    id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, bodyHtml: a.body_html,
    coverImage: a.cover_image, category: a.category, tags: a.tags ? JSON.parse(a.tags) : [],
    status: a.status, authorName: a.author_name, createdAt: a.created_at, updatedAt: a.updated_at, publishedAt: a.published_at
  };
}

// GET /api/articles — public: published only. Admins pass ?all=1 to see drafts too.
router.get('/', optionalAuth, (req, res) => {
  const wantAll = req.query.all === '1' && req.user && req.user.role === 'admin';
  const rows = wantAll
    ? db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all()
    : db.prepare(`SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC`).all();
  res.json({ articles: rows.map(serialize) });
});

router.get('/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!row || row.status !== 'published') return res.status(404).json({ error: 'Article not found.' });
  res.json({ article: serialize(row) });
});

router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { title, excerpt, bodyHtml, coverImage, category, tags, status } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!bodyHtml || !bodyHtml.trim()) return res.status(400).json({ error: 'Article body cannot be empty.' });

  const id = 'art_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const slug = uniqueSlug(slugify(title));
  const clean = sanitizeHtml(bodyHtml, SANITIZE_OPTS);
  const finalStatus = status === 'published' ? 'published' : 'draft';
  const now = Date.now();

  db.prepare(`INSERT INTO articles (id,title,slug,excerpt,body_html,cover_image,category,tags,status,author_id,author_name,created_at,updated_at,published_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, title.trim(), slug, (excerpt||'').trim(), clean, coverImage || null, category || 'General',
    JSON.stringify((tags||[]).slice(0,8)), finalStatus, req.user.id, req.user.name, now, now,
    finalStatus === 'published' ? now : null
  );

  res.status(201).json({ article: serialize(db.prepare('SELECT * FROM articles WHERE id = ?').get(id)) });
});

router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found.' });

  const { title, excerpt, bodyHtml, coverImage, category, tags, status } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!bodyHtml || !bodyHtml.trim()) return res.status(400).json({ error: 'Article body cannot be empty.' });

  const slug = title.trim() !== existing.title ? uniqueSlug(slugify(title), existing.id) : existing.slug;
  const clean = sanitizeHtml(bodyHtml, SANITIZE_OPTS);
  const finalStatus = status === 'published' ? 'published' : 'draft';
  const wasPublished = existing.status === 'published';
  const publishedAt = finalStatus === 'published' ? (wasPublished ? existing.published_at : Date.now()) : null;

  db.prepare(`UPDATE articles SET title=?, slug=?, excerpt=?, body_html=?, cover_image=?, category=?, tags=?, status=?, updated_at=?, published_at=? WHERE id=?`).run(
    title.trim(), slug, (excerpt||'').trim(), clean, coverImage || null, category || 'General',
    JSON.stringify((tags||[]).slice(0,8)), finalStatus, Date.now(), publishedAt, req.params.id
  );

  res.json({ article: serialize(db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found.' });
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
