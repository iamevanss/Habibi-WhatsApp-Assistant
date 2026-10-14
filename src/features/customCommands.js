// features/customCommands.js — owner-defined exact-match replies
const { Collection } = require('../db');
const store = new Collection('custom_commands', {});
const MAX_COMMANDS = 200;
function add(trigger, response) {
  const key = String(trigger || '').trim().toLowerCase();
  if (!key) return { ok: false, error: 'Empty trigger.' };
  if (key.length > 100) return { ok: false, error: 'Trigger too long (max 100 chars).' };
  const text = String(response || '').trim();
  if (!text) return { ok: false, error: 'Empty response.' };
  if (text.length > 2000) return { ok: false, error: 'Response too long (max 2000 chars).' };
  const all = store.all();
  if (!(key in all) && Object.keys(all).length >= MAX_COMMANDS) return { ok: false, error: `Limit of ${MAX_COMMANDS} custom commands reached — remove one first.` };
  store.set(key, text); return { ok: true, trigger: key };
}
function remove(trigger) { const key = String(trigger || '').trim().toLowerCase(); if (!store.get(key, null)) return { ok: false, error: 'No such command.' }; store.delete(key); return { ok: true }; }
function list() { return Object.keys(store.all()); }
function match(text) { const key = String(text || '').trim().toLowerCase(); return key ? store.get(key, null) : null; }
module.exports = { add, remove, list, match };
