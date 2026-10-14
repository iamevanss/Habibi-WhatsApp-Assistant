'use strict';
// Optional anti-delete message cache. Integrate the exported functions with message events.
const cache = new Map();
const DEFAULT_TTL = 60 * 60 * 1000;
function messageId(message) { return message?.key?.id || message?.id || null; }
function remember(message, ttl = DEFAULT_TTL) {
  const id = messageId(message);
  if (!id || !message) return false;
  cache.set(id, { message, expiresAt: Date.now() + Math.max(1000, Number(ttl) || DEFAULT_TTL) });
  return true;
}
function retrieve(id) {
  const item = cache.get(String(id || ''));
  if (!item) return null;
  if (item.expiresAt <= Date.now()) { cache.delete(String(id)); return null; }
  return item.message;
}
function forget(id) { return cache.delete(String(id || '')); }
function prune() {
  const now = Date.now();
  for (const [id, item] of cache) if (item.expiresAt <= now) cache.delete(id);
  return cache.size;
}
module.exports = { remember, retrieve, forget, prune, messageId };
