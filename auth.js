const crypto = require('crypto');
const storage = require('./storage');

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || '';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies;
}

async function getSession(req) {
  const token = parseCookies(req).session;
  if (!token) return null;
  const sessions = await storage.getItem('auth-sessions') || {};
  const session = sessions[token];
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    delete sessions[token];
    await storage.setItem('auth-sessions', sessions);
    return null;
  }
  return session;
}

async function createSession(userData) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = await storage.getItem('auth-sessions') || {};
  sessions[token] = {
    ...userData,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  await storage.setItem('auth-sessions', sessions);
  return token;
}

async function destroySession(req) {
  const token = parseCookies(req).session;
  if (!token) return;
  const sessions = await storage.getItem('auth-sessions') || {};
  delete sessions[token];
  await storage.setItem('auth-sessions', sessions);
}

function sessionCookie(token) {
  return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

function clearCookie() {
  return 'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
}

module.exports = { hashPassword, getSession, createSession, destroySession, sessionCookie, clearCookie };
