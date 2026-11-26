'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const SEED_PATH = path.join(process.cwd(), 'data', 'products.json');
const TMP_PATH = path.join(os.tmpdir(), 'ituc-products.json');
const REDIS_KEY = 'ituc:products:v1';

const VALID_CATEGORIES = new Set(['celulares', 'accesorios']);
const VALID_STOCK = new Set(['disponible', 'ultimas', 'pedido']);
const MAX_DATA_IMAGE_LEN = 450000;

function getRedisConfig() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      url: process.env.KV_REST_API_URL.replace(/\/+$/, ''),
      token: process.env.KV_REST_API_TOKEN,
    };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, ''),
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
  }
  return null;
}

function getStorageInfo() {
  if (getRedisConfig()) {
    return {
      mode: 'redis',
      persistent: true,
      label: 'Base en la nube (Redis)',
    };
  }
  if (process.env.VERCEL) {
    return {
      mode: 'ephemeral',
      persistent: false,
      label: 'Modo Demo (sin Redis conectado)',
    };
  }
  return {
    mode: 'file',
    persistent: true,
    label: 'Archivo local (data/products.json)',
  };
}

function normalizeProductsList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, idx) => ({
      id: String(item.id || ''),
      title: String(item.title || '').trim(),
      category: VALID_CATEGORIES.has(item.category) ? item.category : 'celulares',
      subtitle: String(item.subtitle || '').trim(),
      price: String(item.price || 'Consultar').trim() || 'Consultar',
      stock: VALID_STOCK.has(item.stock) ? item.stock : 'disponible',
      image: String(item.image || 'assets/img/cat-iphones.png').trim(),
      visible: item.visible !== false,
      order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : idx,
    }))
    .sort((a, b) => a.order - b.order)
    .map((item, idx) => Object.assign({}, item, { order: idx }));
}

async function readSeedProducts() {
  try {
    const raw = await fs.readFile(SEED_PATH, 'utf8');
    return normalizeProductsList(JSON.parse(raw));
  } catch {
    return normalizeProductsList(require('../../data/products.json'));
  }
}

async function runRedisCommand(config, commandParts) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandParts),
  });
  if (!response.ok) {
    throw new Error('Redis REST HTTP ' + response.status);
  }
  const payload = await response.json();
  if (payload && payload.error) {
    throw new Error(String(payload.error));
  }
  return payload ? payload.result : null;
}

async function getProducts() {
  const info = getStorageInfo();

  if (info.mode === 'redis') {
    const config = getRedisConfig();
    const result = await runRedisCommand(config, ['GET', REDIS_KEY]);
    if (result) {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (Array.isArray(parsed)) {
        return normalizeProductsList(parsed);
      }
    }
    const seed = await readSeedProducts();
    await runRedisCommand(config, ['SET', REDIS_KEY, JSON.stringify(seed)]);
    return seed;
  }

  if (info.mode === 'ephemeral') {
    try {
      const raw = await fs.readFile(TMP_PATH, 'utf8');
      return normalizeProductsList(JSON.parse(raw));
    } catch {
      return readSeedProducts();
    }
  }

  return readSeedProducts();
}

async function saveProducts(products) {
  const normalized = normalizeProductsList(products);
  const info = getStorageInfo();

  if (info.mode === 'redis') {
    const config = getRedisConfig();
    await runRedisCommand(config, ['SET', REDIS_KEY, JSON.stringify(normalized)]);
    return normalized;
  }

  if (info.mode === 'ephemeral') {
    await fs.writeFile(TMP_PATH, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
  }

  await fs.mkdir(path.dirname(SEED_PATH), { recursive: true });
  await fs.writeFile(SEED_PATH, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}

function isAllowedImage(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('assets/img/') && !trimmed.includes('..') && !trimmed.includes('\\')) {
    return /^assets\/img\/[a-zA-Z0-9._-]+$/.test(trimmed);
  }
  if (trimmed.startsWith('https://')) {
    return trimmed.length <= 500;
  }
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed.length <= MAX_DATA_IMAGE_LEN;
  }
  return false;
}

function validateProductInput(body, isUpdate = false) {
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!isUpdate || input.title !== undefined) {
    if (title.length < 2 || title.length > 80) {
      errors.title = 'El nombre debe tener entre 2 y 80 caracteres.';
    }
  }

  const category = typeof input.category === 'string' ? input.category.trim().toLowerCase() : '';
  if (!isUpdate || input.category !== undefined) {
    if (!VALID_CATEGORIES.has(category)) {
      errors.category = 'La categoría debe ser celulares o accesorios.';
    }
  }

  const subtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
  if (subtitle.length > 90) {
    errors.subtitle = 'El detalle breve no puede superar los 90 caracteres.';
  }

  const rawPrice = typeof input.price === 'string' ? input.price.trim() : '';
  const price = rawPrice || 'Consultar';
  if (price.length > 32) {
    errors.price = 'El precio no puede superar los 32 caracteres.';
  }

  const stock =
    typeof input.stock === 'string' && input.stock.trim()
      ? input.stock.trim().toLowerCase()
      : 'disponible';
  if (!isUpdate || input.stock !== undefined) {
    if (!VALID_STOCK.has(stock)) {
      errors.stock = 'Estado de stock inválido.';
    }
  }

  const defaultImage =
    category === 'accesorios' ? 'assets/img/cat-ecosystem.png' : 'assets/img/cat-iphones.png';
  const rawImage = typeof input.image === 'string' && input.image.trim() ? input.image.trim() : '';
  const image = rawImage || (!isUpdate ? defaultImage : '');
  if (!isUpdate || input.image !== undefined) {
    if (!isAllowedImage(image)) {
      errors.image =
        'Imagen inválida. Usá un preset, URL https:// o archivo PNG/JPG/WebP menor a ~320 KB.';
    }
  }

  const visible = input.visible === undefined ? true : Boolean(input.visible);

  const data = {};
  if (!isUpdate || input.title !== undefined) data.title = title;
  if (!isUpdate || input.category !== undefined) data.category = category;
  if (!isUpdate || input.subtitle !== undefined) data.subtitle = subtitle;
  if (!isUpdate || input.price !== undefined) data.price = price;
  if (!isUpdate || input.stock !== undefined) data.stock = stock;
  if (!isUpdate || input.image !== undefined) data.image = image;
  if (!isUpdate || input.visible !== undefined) data.visible = visible;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data,
  };
}

function generateProductId(title, existingIds) {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'producto';

  let candidate = base;
  let counter = 2;
  const used = new Set(existingIds || []);
  while (used.has(candidate)) {
    candidate = base + '-' + counter;
    counter += 1;
  }
  return candidate;
}

module.exports = {
  getStorageInfo,
  getProducts,
  saveProducts,
  validateProductInput,
  generateProductId,
};
