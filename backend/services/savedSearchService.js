const db = require('../models');

const SCOPE_MAX = 128;
const NAME_MAX = 160;

function normalizeScope(scope) {
  const s = String(scope || '').trim().slice(0, SCOPE_MAX);
  return s || null;
}

function normalizeName(name) {
  const n = String(name || '').trim().slice(0, NAME_MAX);
  return n || null;
}

function normalizeFilters(filters) {
  if (filters == null) return {};
  if (typeof filters !== 'object' || Array.isArray(filters)) {
    const err = new Error('filters must be an object');
    err.status = 400;
    throw err;
  }
  const out = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === '') continue;
    const k = String(key).trim().slice(0, 64);
    if (!k) continue;
    out[k] = typeof value === 'string' ? value.trim().slice(0, 500) : value;
  }
  return out;
}

async function listForUser(userId, scope) {
  const where = { userId };
  const normalized = normalizeScope(scope);
  if (normalized) where.scope = normalized;
  return db.SavedSearch.findAll({
    where,
    order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
  });
}

async function createForUser(userId, { scope, name, filters }) {
  if (!db.SavedSearch) {
    const err = new Error('Saved searches are not available');
    err.status = 500;
    throw err;
  }
  const normalizedScope = normalizeScope(scope);
  const normalizedName = normalizeName(name);
  if (!normalizedScope) {
    const err = new Error('scope is required');
    err.status = 400;
    throw err;
  }
  if (!normalizedName) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }
  const normalizedFilters = normalizeFilters(filters);
  if (!Object.keys(normalizedFilters).length) {
    const err = new Error('Set at least one filter before saving');
    err.status = 400;
    throw err;
  }
  const existing = await db.SavedSearch.findOne({
    where: { userId, scope: normalizedScope, name: normalizedName }
  });
  if (existing) {
    const err = new Error('A saved search with this name already exists');
    err.status = 400;
    throw err;
  }
  return db.SavedSearch.create({
    userId,
    scope: normalizedScope,
    name: normalizedName,
    filters: normalizedFilters
  });
}

async function findOwned(userId, id) {
  return db.SavedSearch.findOne({ where: { id, userId } });
}

async function updateOwned(userId, id, { name, filters }) {
  const row = await findOwned(userId, id);
  if (!row) return null;
  const updates = {};
  if (name !== undefined) {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      const err = new Error('name is required');
      err.status = 400;
      throw err;
    }
    updates.name = normalizedName;
  }
  if (filters !== undefined) {
    updates.filters = normalizeFilters(filters);
  }
  if (Object.keys(updates).length) await row.update(updates);
  return row;
}

async function deleteOwned(userId, id) {
  const row = await findOwned(userId, id);
  if (!row) return false;
  await row.destroy();
  return true;
}

module.exports = {
  listForUser,
  createForUser,
  updateOwned,
  deleteOwned,
  findOwned
};
