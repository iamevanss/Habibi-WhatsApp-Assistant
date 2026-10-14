'use strict';
function normalizeParticipants(items) { return [...new Set((Array.isArray(items) ? items : []).map(x => String(x || '').trim()).filter(Boolean))]; }
function buildGroupNotice(action, actor, target) { const allowed = new Set(['promoted', 'demoted', 'added', 'removed', 'joined', 'left']); const verb = String(action || '').toLowerCase(); if (!allowed.has(verb)) throw new Error('Unsupported group action'); return { action: verb, actor: String(actor || 'A group admin'), target: String(target || 'a participant'), timestamp: new Date().toISOString() }; }
function isAdmin(sender, admins = []) { const id = String(sender || '').split(':')[0]; return (Array.isArray(admins) ? admins : []).some(a => String(a).split(':')[0] === id); }
module.exports = { normalizeParticipants, buildGroupNotice, isAdmin };
