// suspend.js — timed mute for group members.
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const store = new Collection('group_suspends', {});
function key(groupId, userId) { return `${String(groupId)}::${String(userId)}`; }
function userKey(userJid) { return numFromJid(userJid) || String(userJid || '').replace(/@.*/, ''); }
function parseDuration(input) {
  if (input == null) return null;
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) return input < 10000 ? Math.floor(input * 1000) : Math.floor(input);
  const s = String(input).trim().toLowerCase(); if (!s) return null; let totalMs = 0; let matched = false;
  const re = /(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?)/gi; let m;
  while ((m = re.exec(s)) !== null) { matched = true; const n = parseFloat(m[1]); const u = m[2].toLowerCase(); if (/^ms/.test(u)) totalMs += n; else if (/^s/.test(u)) totalMs += n * 1000; else if (/^m/.test(u)) totalMs += n * 60000; else if (/^h/.test(u)) totalMs += n * 3600000; else if (/^d/.test(u)) totalMs += n * 86400000; }
  if (matched && totalMs > 0) return Math.floor(totalMs);
  if (/^\d+(?:\.\d+)?$/.test(s)) { const n = parseFloat(s); if (n > 0) return Math.floor(n * 1000); } return null;
}
function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'; const s = Math.floor(ms / 1000); if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) { const rem = s % 60; return rem ? `${m}m ${rem}s` : `${m}m`; }
  const h = Math.floor(m / 60); if (h < 48) { const rem = m % 60; return rem ? `${h}h ${rem}m` : `${h}h`; }
  const d = Math.floor(h / 24); const remH = h % 24; return remH ? `${d}d ${remH}h` : `${d}d`;
}
function formatRemaining(ms) { return formatDuration(ms); }
function suspend(groupId, userJid, duration, opts = {}) {
  if (opts == null || typeof opts === 'string') opts = { by: arguments[3] || null, reason: arguments[4] || '' };
  const uid = userKey(userJid); if (!groupId || !uid) return { ok: false, error: 'Missing group or user.' };
  let ms = typeof duration === 'number' ? duration : parseDuration(duration); if (typeof duration === 'number' && duration > 0 && duration < 1000) ms = Math.floor(duration * 1000);
  if (!ms || ms <= 0) return { ok: false, error: 'Invalid duration. Try: 30s, 5 minutes, 1 hour, 2h' };
  ms = Math.min(ms, 30 * 24 * 60 * 60 * 1000); const expiresAt = Date.now() + ms;
  const entry = { groupId: String(groupId), userId: uid, expiresAt, startedAt: Date.now(), by: opts.by ? userKey(opts.by) : null, reason: String(opts.reason || '').slice(0, 200) };
  store.set(key(groupId, uid), entry); return { ok: true, userId: uid, expiresAt, remaining: formatDuration(ms), remainingMs: ms, entry };
}
function unsuspend(groupId, userJid) { const uid = userKey(userJid); const k = key(groupId, uid); const had = store.get(k, null); store.delete(k); return { removed: !!had, userId: uid }; }
function getSuspend(groupId, userJid) { const uid = userKey(userJid); const k = key(groupId, uid); const entry = store.get(k, null); if (!entry) return null; if (Date.now() >= entry.expiresAt) { store.delete(k); return null; } return entry; }
function isSuspended(groupId, userJid, aliases = []) {
  for (const c of [userJid, ...(aliases || [])].filter(Boolean)) { const entry = getSuspend(groupId, c); if (entry) return { active: true, remainingMs: Math.max(0, entry.expiresAt - Date.now()), entry, userId: entry.userId }; }
  return { active: false, remainingMs: 0 };
}
function remainingMs(groupId, userJid) { const e = getSuspend(groupId, userJid); return e ? Math.max(0, e.expiresAt - Date.now()) : 0; }
function listGroup(groupId) {
  const all = store.all() || {}; const out = []; const prefix = `${String(groupId)}::`;
  for (const [k, entry] of Object.entries(all)) { if (!k.startsWith(prefix)) continue; if (!entry || Date.now() >= entry.expiresAt) { store.delete(k); continue; } out.push({ ...entry, remaining: formatDuration(entry.expiresAt - Date.now()), remainingMs: Math.max(0, entry.expiresAt - Date.now()) }); }
  return out.sort((a, b) => a.expiresAt - b.expiresAt);
}
function listSuspended(groupId) { return listGroup(groupId); }
module.exports = { parseDuration, formatDuration, formatRemaining, suspend, unsuspend, getSuspend, isSuspended, remainingMs, listGroup, listSuspended, userKey };
