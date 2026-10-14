// features/starboard.js — react to a message with ⭐ (or whatever emoji the group picks)
// enough times and the bot reposts it to a designated "starboard" chat.
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Collection } = require('../db');
const logger = require('../logger');
const settingsStore = new Collection('starboard_settings', {});
const tallyStore = new Collection('starboard_tally', {});
const DEFAULTS = { enabled: false, emoji: '⭐', threshold: 3, targetChatId: null };
const MAX_CACHE = 500, CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();
function cacheKey(chatId, msgId) { return `${chatId}:${msgId}`; }
function evictOld() {
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [k, v] of cache) { if (v.ts < cutoff) cache.delete(k); else break; }
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
}
async function captureMessage(sock, msg) {
  try {
    const chatId = msg.key.remoteJid;
    if (!chatId || msg.key.fromMe || !msg.message || !getSettings(chatId).enabled) return;
    const id = msg.key.id; if (!id) return;
    const senderJid = msg.key.participant || chatId, mt = msg.message;
    const text = mt.conversation || mt.extendedTextMessage?.text || mt.imageMessage?.caption || mt.videoMessage?.caption || '';
    let buffer = null, mimetype = null, kind = 'text';
    const mediaType = mt.imageMessage ? 'image' : mt.videoMessage ? 'video' : null;
    if (mediaType) {
      try { buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage }); mimetype = mt[`${mediaType}Message`].mimetype; kind = mediaType; }
      catch (e) { logger.warn({ err: e.message }, 'starboard: media download failed, caching text only'); }
    }
    cache.set(cacheKey(chatId, id), { senderJid, text, buffer, mimetype, kind, ts: Date.now() }); evictOld();
  } catch (e) { logger.warn({ err: e.message }, 'starboard: captureMessage failed'); }
}
function getCached(chatId, msgId) { return cache.get(cacheKey(chatId, msgId)) || null; }
function getSettings(groupId) { return { ...DEFAULTS, ...settingsStore.get(groupId, {}) }; }
function updateSettings(groupId, patch) { return settingsStore.update(groupId, (cur = {}) => ({ ...DEFAULTS, ...cur, ...patch })); }
function registerReaction(groupId, msgId, emoji, reactorId, remove) {
  const settings = getSettings(groupId);
  if (!settings.enabled || emoji !== settings.emoji) return { shouldPost: false };
  const key = `${groupId}:${msgId}`, rec = tallyStore.get(key, { reactors: [], posted: false });
  const idx = rec.reactors.indexOf(reactorId);
  if (remove) { if (idx !== -1) rec.reactors.splice(idx, 1); } else if (idx === -1) rec.reactors.push(reactorId);
  tallyStore.set(key, rec);
  if (!rec.posted && rec.reactors.length >= settings.threshold) { rec.posted = true; tallyStore.set(key, rec); return { shouldPost: true, count: rec.reactors.length, targetChatId: settings.targetChatId }; }
  return { shouldPost: false, count: rec.reactors.length };
}
module.exports = { getSettings, updateSettings, registerReaction, captureMessage, getCached };
