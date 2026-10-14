// features/dailyReport.js — once-per-day owner summary
const { Collection } = require('../db');
const config = require('../config');
const logger = require('../logger');
const genQuota = require('./genQuota');
const usageTracker = require('./usageTracker');
const meta = new Collection('daily_report_meta', {});
const stats = new Collection('daily_stats', { messages: 0, groups: 0, dms: 0, errors: 0, gens: 0, day: '' });
function dayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function ensureDay() {
  const k = dayKey(), s = stats.get('today', { messages: 0, groups: 0, dms: 0, errors: 0, gens: 0, day: k });
  if (s.day !== k) { const fresh = { messages: 0, groups: 0, dms: 0, errors: 0, gens: 0, day: k }; stats.set('today', fresh); return fresh; }
  return s;
}
function bump(field, n = 1) { try { const s = ensureDay(); s[field] = (s[field] || 0) + n; stats.set('today', s); } catch {} }
function formatReport() {
  const s = ensureDay(); let usage = '';
  try { usage = '\n\n' + usageTracker.formatReport(); } catch {}
  return `📊 *Daily report* — ${s.day}\n────────────────\nMessages handled: ${s.messages}\n· Groups: ${s.groups}\n· DMs: ${s.dms}\nErrors logged: ${s.errors}\nImage/video gens: ${s.gens}\nGen quota (public): ${genQuota.LIMIT} / 6h${usage}\n_Auto report · Habibi_`;
}
function start(sock) {
  if (start._timer) return;
  const hour = Number(process.env.DAILY_REPORT_HOUR || 8);
  start._timer = setInterval(async () => {
    try {
      const now = new Date(), k = dayKey(now);
      if (meta.get('lastSentDay', '') === k || now.getHours() < hour) return;
      const text = formatReport();
      for (const oid of (config.ownerIds || []).slice(0, 5)) { const jid = String(oid).includes('@') ? oid : `${oid}@s.whatsapp.net`; await sock.sendMessage(jid, { text }).catch(() => {}); }
      meta.set('lastSentDay', k); logger.info({ day: k }, 'daily report sent');
    } catch (e) { logger.warn({ err: e.message }, 'daily report failed'); }
  }, 15 * 60 * 1000);
}
module.exports = { bump, formatReport, start, ensureDay };
