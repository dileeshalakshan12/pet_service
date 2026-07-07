// middleware/auth.js — verifies the JWT on protected routes and enforces
// role checks. Tokens are signed server-side with a secret that never
// reaches the browser, so they can't be forged client-side.
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, providerId, name, email }
    next();
  } catch (e){
    return res.status(401).json({ error: 'Invalid or expired session — please log in again.' });
  }
}

function requireRole(...roles){
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)){
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

// Attaches req.user if a valid token is present, but doesn't block the
// request if it's missing — used for endpoints that behave differently
// for logged-in vs anonymous users (e.g. showing "saved by me" state).
function optionalAuth(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token){
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch (e) { /* ignore invalid token */ }
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
