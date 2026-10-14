// features/scheduledLeaderboard.js — scheduled daily or weekly leaderboard posts
const { Collection } = require('../db');
const logger = require('../logger');
const store = new Collection('scheduled_leaderboard', {});
const DEFAULTS = { enabled: false, kind: 'level', frequency: 'weekly' };
function getSettings(chatId) { return { ...DEFAULTS, ...store.get(chatId, {}) }; }
function updateSettings(chatId, patch) { return store.update(chatId, (cur = {}) => ({ ...DEFAULTS, ...cur, ...patch })); }
function periodKey(frequency, date) {
  if (frequency === 'daily') return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}
const CHECK_MS = 60 * 60 * 1000;
let timer = null;
function startScheduler(postFn) {
  if (timer) return;
  timer = setInterval(async () => {
    const now = new Date(), all = store.all();
    for (const [chatId, rec] of Object.entries(all)) {
      const settings = { ...DEFAULTS, ...rec };
      if (!settings.enabled) continue;
      const key = periodKey(settings.frequency, now);
      if (rec.lastPostedKey === key) continue;
      try { await postFn(chatId, settings.kind); store.set(chatId, { ...rec, lastPostedKey: key }); }
      catch (e) { logger.warn({ err: e.message, chatId }, 'scheduledLeaderboard: post failed'); }
    }
  }, CHECK_MS);
}
module.exports = { getSettings, updateSettings, startScheduler };
