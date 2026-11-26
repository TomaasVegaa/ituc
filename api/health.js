'use strict';

const { isAuthenticated, isUsingDefaultPassword, sendJson } = require('./_lib/auth');
const { getStorageInfo } = require('./_lib/store');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Método no permitido.' });
  }

  return sendJson(res, 200, {
    ok: true,
    storage: getStorageInfo(),
    authenticated: isAuthenticated(req),
    usingDefaultPassword: isUsingDefaultPassword(),
  });
};
