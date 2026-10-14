// features/birthdays.js — set a birthday (month/day only) and announce it in the saved chat.
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const logger = require('../logger');
const store = new Collection('birthdays', {});
function setBirthday(userId, chatId, month, day) {
  userId = numFromJid(userId); month = Number(month); day = Number(day);
  if (!(month >= 1 && month <= 12)) return { ok: false, error: 'Month must be 1-12.' };
  const daysInMonth = new Date(2024, month, 0).getDate();
  if (!(day >= 1 && day <= daysInMonth)) return { ok: false, error: `Day must be 1-${daysInMonth} for that month.` };
  store.set(userId, { ...store.get(userId, {}), month, day, chatId }); return { ok: true, month, day };
}
function getBirthday(userId) { const rec = store.get(numFromJid(userId), null); return rec ? { month: rec.month, day: rec.day } : null; }
function removeBirthday(userId) { userId = numFromJid(userId); if (!store.get(userId, null)) return { ok: false, error: 'No birthday set.' }; store.delete(userId); return { ok: true }; }
const CHECK_MS = 6 * 60 * 60 * 1000;
let activeSock = null, timer = null;
function startScheduler(sock) {
  activeSock = sock; if (timer) return;
  timer = setInterval(async () => {
    if (!activeSock) return;
    const now = new Date(), month = now.getMonth() + 1, day = now.getDate(), year = now.getFullYear();
    for (const [userId, rec] of Object.entries(store.all())) {
      if (rec.month !== month || rec.day !== day || rec.lastAnnouncedYear === year) continue;
      try {
        await activeSock.sendMessage(rec.chatId, { text: `🎂 Happy birthday, @${userId}! 🎉`, mentions: [`${userId}@s.whatsapp.net`] });
        store.set(userId, { ...rec, lastAnnouncedYear: year });
      } catch (e) { logger.warn({ err: e.message, userId }, 'birthdays: failed to send announcement'); }
    }
  }, CHECK_MS);
}
module.exports = { setBirthday, getBirthday, removeBirthday, startScheduler };
