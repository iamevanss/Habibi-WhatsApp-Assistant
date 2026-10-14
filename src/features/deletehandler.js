'use strict';
// Helpers for processing message-deletion notifications.
function getMessageKey(update) {
  return update?.key || update?.messageKey || update?.message?.key || null;
}
function getChatId(update) {
  const key = getMessageKey(update);
  return key?.remoteJid || update?.chatId || null;
}
function getParticipant(update) {
  const key = getMessageKey(update);
  return key?.participant || update?.participant || null;
}
function isGroup(update) { return String(getChatId(update) || '').endsWith('@g.us'); }
function describeDeletion(update) {
  return {
    key: getMessageKey(update),
    chatId: getChatId(update),
    participant: getParticipant(update),
    group: isGroup(update),
    timestamp: Date.now(),
  };
}
module.exports = { getMessageKey, getChatId, getParticipant, isGroup, describeDeletion };
