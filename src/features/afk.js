// features/afk.js — away status per user
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const store = new Collection('afk_status', {});
const AFK_SET_RE = /^(brb|afk|away|gtg|be right back)\b[\s,:.\-]*(.*)$/i;
function setAfk(userJid, reason) { const key = numFromJid(userJid), entry = { reason: (reason || '').trim() || 'AFK', since: Date.now() }; store.set(key, entry); return entry; }
function clearAfk(userJid) { const key = numFromJid(userJid), prev = store.get(key, null); if (prev) store.delete(key); return prev; }
function getAfk(userJid) { return store.get(numFromJid(userJid), null); }
function parseAfkCommand(text) { const m = String(text || '').trim().match(AFK_SET_RE); if (!m) return null; return (m[2] || '').trim() || 'AFK'; }
module.exports = { setAfk, clearAfk, getAfk, parseAfkCommand, AFK_SET_RE };
