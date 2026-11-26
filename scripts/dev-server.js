'use strict';

const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const authHandler = require('../api/auth');
const healthHandler = require('../api/health');
const productsHandler = require('../api/products');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const BLOCKED_STATIC_PATHS = new Set([
  '/package.json',
  '/vercel.json',
  '/readme.md',
  '/.gitignore',
  '/.vercelignore',
]);

async function serveStatic(pathname, res) {
  let targetRel = pathname;
  if (targetRel === '/') {
    targetRel = '/index.html';
  } else if (targetRel === '/catalogo' || targetRel === '/catalogo/') {
    targetRel = '/catalogo.html';
  } else if (targetRel === '/admin' || targetRel === '/admin/') {
    targetRel = '/admin.html';
  }

  const normalized = path.posix.normalize(targetRel);
  const lower = normalized.toLowerCase();

  if (
    normalized.includes('..') ||
    lower.startsWith('/api') ||
    lower.startsWith('/scripts') ||
    lower.startsWith('/.git') ||
    lower.startsWith('/.env') ||
    BLOCKED_STATIC_PATHS.has(lower)
  ) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('No encontrado');
    return;
  }

  const filePath = path.join(ROOT_DIR, normalized);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.statusCode = 403;
    res.end('Prohibido');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.statusCode = 404;
      res.end('No encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await fs.readFile(filePath);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    if (ext === '.json') {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('No encontrado');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const pathname = urlObj.pathname;

    req.query = {};
    urlObj.searchParams.forEach((value, key) => {
      req.query[key] = value;
    });

    if (pathname === '/api/health') {
      return await healthHandler(req, res);
    }
    if (pathname === '/api/auth') {
      return await authHandler(req, res);
    }
    if (pathname === '/api/products') {
      return await productsHandler(req, res);
    }
    if (pathname.startsWith('/api/products/')) {
      const idPart = decodeURIComponent(pathname.slice('/api/products/'.length));
      if (idPart) {
        req.query.id = idPart;
        const sep = urlObj.search ? '&' : '?';
        req.url = pathname + urlObj.search + sep + 'id=' + encodeURIComponent(idPart);
      }
      return await productsHandler(req, res);
    }

    return await serveStatic(pathname, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: err && err.message ? err.message : 'Error interno' }));
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('iTuc Cel servidor activo');
    console.log('  Sitio: http://localhost:' + PORT);
    console.log('  Catálogo: http://localhost:' + PORT + '/catalogo');
    console.log('  Admin: http://localhost:' + PORT + '/admin');
  });
}

module.exports = server;
