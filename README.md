# Pawstop — Pet Services Marketplace + Blog CMS

A pet services booking marketplace with a **real backend now**: Node.js + Express + SQLite, secure authentication, and a no-code admin panel for writing blog articles.

## Running it

```
cd server
npm install
npm start
```

Then open **http://localhost:4000** — the server serves the entire site (frontend + API) from one process. A `pawstop.db` SQLite file is created automatically in `server/data/` on first run, along with demo data.

> Requires **Node.js 22.5+** (uses Node's built-in `node:sqlite` — no native module compilation, no separate database server to install).

## Demo accounts
(Or use the "Use Demo Customer / Provider / Admin" buttons on the login page.)

| Role | Email | Password |
|---|---|---|
| Customer | `amara@demo.com` | `demo1234` |
| Provider | `provider@demo.com` | `demo1234` |
| Admin | `admin@demo.com` | `demo1234` |

To start over: stop the server, delete `server/data/pawstop.db*`, and restart — it reseeds automatically.

## What's a real database now

**Fully migrated to SQLite, with the frontend calling a real REST API:**
- **Authentication** — registration and login (`js/auth.js` → `/api/auth/*`). Passwords are never stored in plaintext.
- **Blog CMS** — the entire admin article editor and public blog (`admin.html`, `blog.html`, `article.html` → `/api/articles/*`).
- Image uploads for the article editor (`/api/uploads`).

**Full REST API is also built and tested server-side for everything else** — providers, services, bookings, pets, reviews, marketplace posts, messages, notifications, coupons (see `server/routes/`) — but the existing dashboard pages (`dashboard/customer.html`, `dashboard/provider.html`) still read/write that data through the original `localStorage` layer (`js/storage.js`) for this pass. The demo accounts' IDs are kept in sync between the two so the guided demo works end-to-end, but a **freshly self-registered provider** account will authenticate for real (their login is 100% real and secure) while showing up empty in their own dashboard and invisible in the public directory, since that directory still reads the browser's local seed data. Wiring the remaining pages to the already-built API endpoints is a mechanical next step, following the exact pattern used for auth and articles.

## Security measures actually implemented

- **Password hashing** — bcrypt, 10 salt rounds. Plaintext passwords are never written to disk.
- **Signed sessions** — JSON Web Tokens, signed with a server-side secret (`server/.env` → `JWT_SECRET`, change this before any real deployment) and verified on every protected request.
- **Role-based authorization** — middleware (`server/middleware/auth.js`) rejects requests where the JWT's role doesn't match what a route requires (e.g. only `role: admin` can create/edit/delete blog articles; only a provider can edit their own services).
- **Account lockout** — 5 failed logins locks the account for 15 minutes, tracked server-side per account.
- **Generic auth errors** — login never reveals whether the failure was a bad email or bad password, so an attacker can't enumerate registered accounts.
- **Rate limiting** — `/api/auth/login` and `/api/auth/register` are throttled per IP (`express-rate-limit`); the whole API is throttled more loosely as a backstop.
- **SQL injection protection** — every query in `server/routes/` uses parameterized statements (`?` placeholders) — user input is never concatenated into SQL text.
- **Stored-XSS protection** — article HTML from the rich-text editor is passed through `sanitize-html` server-side before it's saved or ever served back to a browser, stripping `<script>` tags and any attributes/tags outside an explicit allowlist.
- **Upload validation** — image uploads check the real MIME type (not just the filename extension), cap file size at 5MB, and regenerate filenames server-side so a client can't control where a file lands.
- **HTTP security headers** — via `helmet`.
- **Admin accounts can't be self-registered** — `role: admin` is not an option on the public sign-up form; admin accounts only exist via direct database seeding/provisioning.

## The no-code blog admin

Log in as the demo admin (or any `admin`-role account) and open `admin.html`:
- **All Articles** — table view with Published/Draft tabs, quick edit/delete, and a live link to view each article.
- **New Article** — a real rich-text editor (bold/italic/underline, H2/H3, bullet/numbered lists, quotes, links, inline images) built on a toolbar + `contenteditable` area, plus a separate cover-image uploader, category picker, and tag input. Hit **Draft** or **Publish** — no HTML, no code, ever.
- Everything typed in the editor is sanitized server-side before it's stored, so the editor can't be used to inject scripts even by a malicious admin session.

Articles show up instantly on the public **Blog** page and at `article.html?slug=...`.

## Project structure

```
pet-services/
├── index.html, services.html, providers.html, provider-profile.html,
│   booking.html, blog.html, article.html, admin.html, about.html,
│   pricing.html, faq.html, contact.html, login.html, register.html
├── dashboard/
│   ├── customer.html
│   └── provider.html
├── css/            (design tokens, dashboard layout, forms, animations, responsive, dark mode)
├── js/
│   ├── api.js       <- NEW: fetch client for the real backend (auth, articles, uploads)
│   ├── storage.js    (now just categories + localStorage CRUD for not-yet-migrated entities)
│   ├── app.js, auth.js, providers.js, booking.js, posts.js, dashboard.js
└── server/                        <- NEW: the real backend
    ├── server.js                  (Express app, security middleware, serves API + static frontend)
    ├── .env                       (JWT secret, port — change JWT_SECRET before deploying!)
    ├── db/
    │   ├── connection.js          (SQLite connection via node:sqlite)
    │   ├── schema.js               (full relational schema, all entities)
    │   └── seed.js                 (idempotent demo data, bcrypt-hashed passwords)
    ├── middleware/auth.js          (JWT verification, role guards)
    ├── routes/
    │   ├── auth.js                 (register, login, /me — hashing, lockout, rate limiting)
    │   ├── articles.js             (blog CMS CRUD, sanitization, admin-only writes)
    │   ├── uploads.js              (validated image upload for the editor)
    │   ├── catalog.js               (providers, services)
    │   ├── pets.js, bookings.js, social.js, inbox.js  (full API for the rest of the app)
    └── data/pawstop.db             (created automatically — this is the actual database file)
```

## Next steps (if you want to keep going)
1. Wire `dashboard/customer.html` / `dashboard/provider.html` to the existing `/api/pets`, `/api/bookings`, `/api/posts`, `/api/reviews`, `/api/coupons`, `/api/messages`, `/api/notifications` endpoints (same pattern as `js/auth.js`) to fully retire `localStorage` for those entities.
2. Update `providers.html` / `services.html` / `provider-profile.html` / `index.html` to fetch from `/api/providers` and `/api/services` instead of the local seed, so self-registered providers actually appear in the public directory.
3. Move the JWT secret and any real deployment config out of `.env` and into your hosting platform's secret manager; put the SQLite file (or swap to Postgres) somewhere with real backups.
