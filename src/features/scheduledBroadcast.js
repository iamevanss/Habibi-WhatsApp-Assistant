// features/scheduledBroadcast.js — owner scheduled messages to groups
const { Collection } = require('../db');
const logger = require('../logger');
const jobs = new Collection('scheduled_broadcasts', {});
let timer = null;
let sockRef = null;
function list() { return Object.entries(jobs.all() || {}).map(([id, j]) => ({ id, ...j })); }
function schedule({ text, whenMs, groupJids = [], repeatHours = 0 }) {
  const id = `bc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const job = { text: String(text || '').slice(0, 4000), when: Number(whenMs) || Date.now() + 60000, groups: Array.isArray(groupJids) ? groupJids : [], repeatHours: Number(repeatHours) || 0, createdAt: Date.now() };
  jobs.set(id, job); return { ok: true, id, job };
}
function cancel(id) { if (!jobs.get(id, null)) return { ok: false, error: 'Not found' }; jobs.delete(id); return { ok: true }; }
async function tick() {
  if (!sockRef) return;
  const now = Date.now();
  for (const [id, job] of Object.entries(jobs.all() || {})) {
    if (!job || job.when > now) continue;
    const targets = job.groups?.length ? job.groups : Object.keys((await sockRef.groupFetchAllParticipating().catch(() => ({}))) || {});
    for (const g of targets.slice(0, 50)) {
      try { await sockRef.sendMessage(g, { text: job.text }); }
      catch (e) { logger.warn({ err: e.message, g }, 'broadcast send failed'); }
    }
    if (job.repeatHours > 0) { job.when = now + job.repeatHours * 3600000; jobs.set(id, job); }
    else jobs.delete(id);
  }
}
function start(sock) { sockRef = sock; if (timer) clearInterval(timer); timer = setInterval(() => tick().catch(() => {}), 30000); return true; }
module.exports = { list, schedule, cancel, start, tick };
