'use strict';

const {
  isUsingDefaultPassword,
  verifyPassword,
  createSessionToken,
  isAuthenticated,
  setSessionCookie,
  clearSessionCookie,
  readJsonBody,
  sendJson,
} = require('./_lib/auth');
const { getStorageInfo } = require('./_lib/store');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return sendJson(res, 200, {
        authenticated: isAuthenticated(req),
        usingDefaultPassword: isUsingDefaultPassword(),
        storage: getStorageInfo(),
      });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const password = body && typeof body.password === 'string' ? body.password : '';
      if (!verifyPassword(password)) {
        return sendJson(res, 401, { error: 'Contraseña incorrecta.' });
      }
      const token = createSessionToken();
      setSessionCookie(res, token, req);
      return sendJson(res, 200, {
        authenticated: true,
        token,
        usingDefaultPassword: isUsingDefaultPassword(),
        storage: getStorageInfo(),
      });
    }

    if (req.method === 'DELETE') {
      clearSessionCookie(res, req);
      return sendJson(res, 200, { authenticated: false });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 500;
    return sendJson(res, status, { error: err && err.message ? err.message : 'Error interno.' });
  }
};
