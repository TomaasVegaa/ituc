'use strict';

const { isAuthenticated, readJsonBody, sendJson } = require('./_lib/auth');
const {
  getStorageInfo,
  getProducts,
  saveProducts,
  validateProductInput,
  generateProductId,
} = require('./_lib/store');

function getRequestQuery(req) {
  const urlObj = new URL(req.url || '/api/products', 'http://localhost');
  const merged = {};
  urlObj.searchParams.forEach((value, key) => {
    merged[key] = value;
  });
  if (req && req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach((key) => {
      if (req.query[key] !== undefined && merged[key] === undefined) {
        merged[key] = String(req.query[key]);
      }
    });
  }
  return merged;
}

module.exports = async function handler(req, res) {
  try {
    const query = getRequestQuery(req);
    const storage = getStorageInfo();

    if (req.method === 'GET') {
      const products = await getProducts();
      const showAll = query.all === '1' && isAuthenticated(req);
      const list = showAll ? products : products.filter((p) => p.visible !== false);
      return sendJson(res, 200, { products: list, storage });
    }

    if (!isAuthenticated(req)) {
      return sendJson(res, 401, { error: 'No autorizado. Iniciá sesión para editar.' });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const check = validateProductInput(body, false);
      if (!check.valid) {
        return sendJson(res, 400, { error: 'Datos inválidos.', errors: check.errors });
      }

      const products = await getProducts();
      const id = generateProductId(
        check.data.title,
        products.map((p) => p.id)
      );

      const newProduct = Object.assign({ id, order: products.length }, check.data);
      const saved = await saveProducts(products.concat(newProduct));
      const created = saved.find((p) => p.id === id) || newProduct;
      return sendJson(res, 201, { product: created, products: saved, storage });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const id = query.id || (typeof body.id === 'string' ? body.id.trim() : '');
      if (!id) {
        return sendJson(res, 400, { error: 'Falta el id del producto.' });
      }

      const products = await getProducts();
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) {
        return sendJson(res, 404, { error: 'Producto no encontrado.' });
      }

      const check = validateProductInput(body, true);
      if (!check.valid) {
        return sendJson(res, 400, { error: 'Datos inválidos.', errors: check.errors });
      }

      const updated = Object.assign({}, products[idx], check.data);
      const next = products.slice();
      next[idx] = updated;
      const saved = await saveProducts(next);
      return sendJson(res, 200, {
        product: saved.find((p) => p.id === id) || updated,
        products: saved,
        storage,
      });
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      if (!Array.isArray(body.orderedIds)) {
        return sendJson(res, 400, { error: 'Se esperaba un listado orderedIds.' });
      }

      const products = await getProducts();
      const byId = new Map(products.map((p) => [p.id, p]));
      const ordered = [];
      const seen = new Set();

      body.orderedIds.forEach((rawId) => {
        const id = String(rawId || '');
        if (byId.has(id) && !seen.has(id)) {
          ordered.push(byId.get(id));
          seen.add(id);
        }
      });

      products.forEach((p) => {
        if (!seen.has(p.id)) {
          ordered.push(p);
        }
      });

      const reindexed = ordered.map((item, idx) => Object.assign({}, item, { order: idx }));
      const saved = await saveProducts(reindexed);
      return sendJson(res, 200, { products: saved, storage });
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req);
      const id = query.id || (typeof body.id === 'string' ? body.id.trim() : '');
      if (!id) {
        return sendJson(res, 400, { error: 'Falta el id del producto.' });
      }

      const products = await getProducts();
      const exists = products.some((p) => p.id === id);
      if (!exists) {
        return sendJson(res, 404, { error: 'Producto no encontrado.' });
      }

      const remaining = products.filter((p) => p.id !== id);
      const saved = await saveProducts(remaining);
      return sendJson(res, 200, { deletedId: id, products: saved, storage });
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 500;
    return sendJson(res, status, { error: err && err.message ? err.message : 'Error interno.' });
  }
};
