'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'ituc_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'ituc2026';
}

function isUsingDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
}

function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  return crypto
    .createHash('sha256')
    .update('ituc-secret-' + getAdminPassword())
    .digest('hex');
}

function verifyPassword(candidate) {
  if (typeof candidate !== 'string' || !candidate) {
    return false;
  }
  const expectedDigest = crypto.createHash('sha256').update(getAdminPassword()).digest();
  const actualDigest = crypto.createHash('sha256').update(candidate).digest();
  return crypto.timingSafeEqual(expectedDigest, actualDigest);
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function createSessionToken() {
  const payload = {
    role: 'admin',
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encodedPayload);
  return encodedPayload + '.' + signature;
}

function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const encodedPayload = parts[0];
  const signature = parts[1];
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSig = signPayload(encodedPayload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return parsed && parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req && req.headers ? req.headers.cookie : '';
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_NAME] && verifySessionToken(cookies[COOKIE_NAME])) {
    return true;
  }
  const authHeader = req && req.headers ? req.headers.authorization : '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (verifySessionToken(bearer)) {
      return true;
    }
  }
  return false;
}

function isHttpsRequest(req) {
  const proto = req && req.headers ? req.headers['x-forwarded-proto'] : '';
  return typeof proto === 'string' && proto.split(',')[0].trim() === 'https';
}

function setSessionCookie(res, token, req) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    COOKIE_NAME + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + maxAge,
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res, req) {
  const parts = [
    COOKIE_NAME + '=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function readJsonBody(req, maxBytes = 1048576) {
  if (req && req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return Promise.resolve({});
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch {
        const err = new Error('JSON inválido.');
        err.statusCode = 400;
        return Promise.reject(err);
      }
    }
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString('utf8');
      if (!raw.trim()) return Promise.resolve({});
      try {
        return Promise.resolve(JSON.parse(raw));
      } catch {
        const err = new Error('JSON inválido.');
        err.statusCode = 400;
        return Promise.reject(err);
      }
    }
    if (typeof req.body === 'object') {
      return Promise.resolve(req.body);
    }
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        const err = new Error('El cuerpo excede el tamaño permitido.');
        err.statusCode = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('JSON inválido.');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(data));
}

module.exports = {
  isUsingDefaultPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  isAuthenticated,
  setSessionCookie,
  clearSessionCookie,
  readJsonBody,
  sendJson,
};
