// features/spamScore.js — simple anti-spam scoring per user per group
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const scores = new Collection('spam_scores', {});
const WINDOW_MS = 60 * 1000;
function key(chatId, userId) { return `${chatId}:${numFromJid(userId)}`; }
function note(chatId, userJid, text = '') {
  const k = key(chatId, userJid), now = Date.now();
  let s = scores.get(k, { hits: [], score: 0, mutedUntil: 0 });
  s.hits = (s.hits || []).filter((t) => now - t < WINDOW_MS); s.hits.push(now);
  let add = 1;
  if (text && text.length > 300) add += 1;
  if (/(.)\1{6,}/.test(text || '')) add += 2;
  if (/https?:\/\//i.test(text || '') && s.hits.length > 3) add += 2;
  s.score = Math.min(100, (s.score || 0) * 0.9 + add * 5);
  if (s.hits.length >= 8) s.score = Math.min(100, s.score + 20);
  scores.set(k, s); return { score: Math.round(s.score), rate: s.hits.length, muted: s.mutedUntil > now };
}
function isSpam(chatId, userJid, threshold = 70) {
  const s = scores.get(key(chatId, userJid), { score: 0, mutedUntil: 0 });
  if (s.mutedUntil && s.mutedUntil > Date.now()) return true;
  return (s.score || 0) >= threshold;
}
function mute(chatId, userJid, minutes = 10) {
  const k = key(chatId, userJid), s = scores.get(k, { hits: [], score: 0, mutedUntil: 0 });
  s.mutedUntil = Date.now() + minutes * 60000; scores.set(k, s); return s.mutedUntil;
}
function status(chatId, userJid) {
  const s = scores.get(key(chatId, userJid), { score: 0, hits: [], mutedUntil: 0 });
  return { score: Math.round(s.score || 0), recent: (s.hits || []).length, mutedUntil: s.mutedUntil || 0 };
}
module.exports = { note, isSpam, mute, status };
