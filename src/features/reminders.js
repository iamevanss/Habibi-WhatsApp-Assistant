// features/reminders.js — "remind me in 20 minutes to check the oven".
// Persisted via db.js (a plain JSON file), so reminders survive process restarts — a
// background interval (startScheduler) polls for due reminders and delivers them.
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const logger = require('../logger');

const store = new Collection('reminders', { list: [] });
function _all() { return store.get('list', []); }

function schedule({ chatId, userJid, dueAt, text }) {
  const list = _all();
  const item = { id: `r${Date.now()}${Math.floor(Math.random() * 10000)}`, chatId, userJid: numFromJid(userJid), text: String(text || '').slice(0, 500), dueAt, createdAt: Date.now() };
  list.push(item); store.set('list', list); return item;
}
function listFor(userJid) { const key = numFromJid(userJid); return _all().filter((r) => r.userJid === key); }
function cancel(id, userJid) {
  const key = numFromJid(userJid), list = _all();
  const idx = list.findIndex((r) => r.id === id && r.userJid === key);
  if (idx === -1) return false;
  list.splice(idx, 1); store.set('list', list); return true;
}
function takeDue(now = Date.now()) {
  const list = _all(), due = list.filter((r) => r.dueAt <= now);
  if (due.length) store.set('list', list.filter((r) => r.dueAt > now));
  return due;
}
const CHECK_MS = 15000;
let activeSock = null, timer = null;
function startScheduler(sock) {
  activeSock = sock;
  if (timer) return;
  timer = setInterval(async () => {
    let due = [];
    try { due = takeDue(); } catch (e) { logger.error({ err: e.message }, 'reminders: failed to check due reminders'); return; }
    for (const r of due) {
      if (!activeSock) continue;
      try { await activeSock.sendMessage(r.chatId, { text: `⏰ Reminder for @${r.userJid}: ${r.text}`, mentions: [`${r.userJid}@s.whatsapp.net`] }); }
      catch (e) { logger.warn({ err: e.message }, 'reminders: failed to deliver reminder'); }
    }
  }, CHECK_MS);
}
module.exports = { schedule, listFor, cancel, startScheduler };
