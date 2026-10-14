'use strict';
const blocked = new Set();
function normalizeId(id) { return String(id || '').trim().toLowerCase(); }
function blockUser(id, reason = 'moderation') { const key = normalizeId(id); if (!key) throw new Error('User ID is required'); blocked.add(key); return { id: key, reason: String(reason), blocked: true }; }
function unblockUser(id) { return blocked.delete(normalizeId(id)); }
function isBlocked(id) { return blocked.has(normalizeId(id)); }
function cleanText(text, maxLength = 4000) { return String(text ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, Math.max(1, Number(maxLength) || 4000)); }
module.exports = { blockUser, unblockUser, isBlocked, cleanText };
