// features/marriage.js — a lighthearted in-chat marriage game.
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const achievements = require('./achievements');
const marriages = new Collection('marriages', {});
const pendingProposals = new Collection('marriage_proposals', {});
const PROPOSAL_TTL_MS = 5 * 60 * 1000;
function getSpouse(userId) { const rec = marriages.get(userId, null); return rec ? rec.partnerId : null; }
function isMarried(userId) { return !!getSpouse(userId); }
function propose(fromId, toId) {
  fromId = numFromJid(fromId); toId = numFromJid(toId);
  if (fromId === toId) return { ok: false, error: "You can't propose to yourself." };
  if (isMarried(fromId)) return { ok: false, error: "You're already married. Divorce first." };
  if (isMarried(toId)) return { ok: false, error: "They're already married to someone else." };
  pendingProposals.set(toId, { fromId, expiresAt: Date.now() + PROPOSAL_TTL_MS });
  return { ok: true };
}
function respond(toId, accept) {
  toId = numFromJid(toId); const proposal = pendingProposals.get(toId, null);
  if (!proposal || proposal.expiresAt < Date.now()) { pendingProposals.delete(toId); return { ok: false, error: 'No pending proposal (or it expired).' }; }
  pendingProposals.delete(toId);
  if (!accept) return { ok: true, accepted: false, fromId: proposal.fromId };
  if (isMarried(proposal.fromId) || isMarried(toId)) return { ok: false, error: 'One of you got married to someone else in the meantime.' };
  const now = Date.now();
  marriages.set(proposal.fromId, { partnerId: toId, marriedAt: now }); marriages.set(toId, { partnerId: proposal.fromId, marriedAt: now });
  achievements.unlock(proposal.fromId, 'married'); achievements.unlock(toId, 'married');
  return { ok: true, accepted: true, fromId: proposal.fromId, marriedAt: now };
}
function divorce(userId) {
  userId = numFromJid(userId); const spouse = getSpouse(userId);
  if (!spouse) return { ok: false, error: "You're not married." };
  marriages.delete(userId); marriages.delete(spouse); return { ok: true, exSpouse: spouse };
}
function status(userId) {
  userId = numFromJid(userId); const rec = marriages.get(userId, null);
  if (!rec) return { married: false };
  return { married: true, partnerId: rec.partnerId, marriedAt: rec.marriedAt };
}
module.exports = { propose, respond, divorce, status, isMarried, getSpouse };
