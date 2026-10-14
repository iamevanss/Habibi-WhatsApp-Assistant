// messageTracker.js — durable index of messages sent by this bot.
const { Collection } = require('../db');
const store = new Collection('bot_sent_messages', {});
const MAX_PER_CHAT = 2500;
function normalizeKey(key) {
  if (!key?.remoteJid || !key?.id) return null;
  return { remoteJid: String(key.remoteJid), id: String(key.id), ...(key.participant ? { participant: String(key.participant) } : {}), fromMe: true };
}
function record(key) {
  const k = normalizeKey(key); if (!k) return null;
  const chat = k.remoteJid, list = store.get(chat, []);
  if (!list.some(x => x.id === k.id)) { list.push(k); if (list.length > MAX_PER_CHAT) list.splice(0, list.length - MAX_PER_CHAT); store.set(chat, list); }
  return k;
}
function list(chatId) { return store.get(String(chatId), []).slice(); }
function remove(chatId, ids) { const wanted = new Set((ids || []).map(String)); store.set(String(chatId), list(chatId).filter(k => !wanted.has(k.id))); }
function clear(chatId) { store.set(String(chatId), []); }
module.exports = { record, list, remove, clear, MAX_PER_CHAT };
