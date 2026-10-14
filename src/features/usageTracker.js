// features/usageTracker.js — approximate token window usage for the current period
const { Collection } = require('../db');
const store = new Collection('token_usage', {});
const DEFAULT_LIMIT = Number(process.env.TOKEN_WINDOW_LIMIT || 450000);
const PERIOD_MS = Number(process.env.TOKEN_WINDOW_MS || 6 * 3600 * 1000);
function state() {
  const s = store.get('window', null), now = Date.now();
  if (!s || !s.startedAt || now - s.startedAt >= PERIOD_MS) { const fresh = { startedAt: now, used: 0, limit: DEFAULT_LIMIT }; store.set('window', fresh); return fresh; }
  return s;
}
function save(s) { store.set('window', s); return s; }
function estimateTokens(text) { return Math.max(1, Math.ceil(String(text || '').length / 4)); }
function addUsage(promptText, completionText, extra = 0) { const s = state(), add = estimateTokens(promptText) + estimateTokens(completionText) + (Number(extra) || 0); s.used = Math.min(s.limit, (s.used || 0) + add); save(s); return report(); }
function report() {
  const s = state(), used = Math.round(s.used || 0), limit = s.limit || DEFAULT_LIMIT, remaining = Math.max(0, limit - used), pct = limit ? used / limit * 100 : 0, endsAt = (s.startedAt || Date.now()) + PERIOD_MS, msLeft = Math.max(0, endsAt - Date.now());
  return { used, limit, remaining, pct: Math.round(pct * 10) / 10, leftPct: Math.max(0, 100 - pct), resetsIn: `${Math.floor(msLeft / 3600000)}h ${Math.floor((msLeft % 3600000) / 60000)}m`, warning: pct >= 50 };
}
function formatReport() { const r = report(); return `*Habibi usage warning:* ${r.pct}% of the current token window has been used.\nYou have *${r.leftPct}%* of usage left\n\nUsed: ${r.used.toLocaleString()} / ${r.limit.toLocaleString()} tokens (${r.pct}%)\n\nRemaining: ${r.remaining.toLocaleString()} tokens\n\nResets in: ${r.resetsIn}\n\nTips:\nUse /ctx to check usage.\n\nUse /compact to reduce the conversation context.`; }
function resetWindow() { save({ startedAt: Date.now(), used: 0, limit: DEFAULT_LIMIT }); return report(); }
module.exports = { addUsage, report, formatReport, resetWindow, estimateTokens };
