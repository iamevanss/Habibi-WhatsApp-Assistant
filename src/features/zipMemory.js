// Simple persistent index for archive notes and generated ZIP metadata.
const { Collection } = require('../db');
const store = new Collection('zip_memory', {});
const MAX_ITEMS = 200;

function keyOf(value) { return String(value || '').trim().slice(0, 180); }
function remember(id, entry = {}) {
  const key = keyOf(id);
  if (!key) throw new Error('A non-empty archive id is required');
  const all = store.all();
  all[key] = { ...entry, id: key, updatedAt: Date.now() };
  const keys = Object.keys(all).sort((a, b) => (all[b].updatedAt || 0) - (all[a].updatedAt || 0));
  for (const old of keys.slice(MAX_ITEMS)) delete all[old];
  store.set('__items', all);
  return all[key];
}
function get(id) { return store.get('__items', {})[keyOf(id)] || null; }
function remove(id) {
  const key = keyOf(id);
  const all = store.get('__items', {});
  if (!Object.prototype.hasOwnProperty.call(all, key)) return false;
  delete all[key]; store.set('__items', all); return true;
}
function list(limit = 50) {
  return Object.values(store.get('__items', {}))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, Math.max(1, Math.min(200, Number(limit) || 50)));
}
function clear() { store.set('__items', {}); }
module.exports = { remember, get, remove, list, clear };
