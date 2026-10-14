// autoreply.js — reliable detection of replies to bot messages, including WhatsApp @lid identities.
const botMessageKeys = new Map(); const botJids = new Set(); const botNums = new Set();
function registerBotJids(jids = []) {
  for (const jid of Array.isArray(jids) ? jids : [jids]) { if (!jid) continue; const raw = String(jid); botJids.add(raw); const n = raw.split('@')[0].split(':')[0]; if (n) botNums.add(n); }
}
function addBotMessage(msgKey) {
  if (!msgKey?.id) return; botMessageKeys.set(msgKey.id, { ...msgKey }); registerBotJids([msgKey.participant, msgKey.senderLid, msgKey.senderPn]);
  if (botMessageKeys.size > 10000) { const arr = Array.from(botMessageKeys.keys()); arr.slice(0, 5000).forEach(k => botMessageKeys.delete(k)); }
}
function unwrap(message) {
  let cur = message;
  for (let i = 0; i < 8 && cur; i++) { const next = cur?.message || cur?.ephemeralMessage?.message || cur?.viewOnceMessageV2?.message || cur?.viewOnceMessage?.message || cur?.documentWithCaptionMessage?.message || cur?.editedMessage?.message; if (next && next !== cur) { cur = next; continue; } break; }
  return cur || {};
}
function contextOf(m) {
  const direct = m?.extendedTextMessage?.contextInfo || m?.imageMessage?.contextInfo || m?.videoMessage?.contextInfo || m?.audioMessage?.contextInfo || m?.documentMessage?.contextInfo || m?.stickerMessage?.contextInfo;
  if (direct) return direct;
  const reaction = m?.reactionMessage; if (reaction?.key) return { stanzaId: reaction.key.id, participant: reaction.key.participant, quotedMessage: null }; return null;
}
function sameBotIdentity(value) { if (!value) return false; const raw = String(value); if (botJids.has(raw)) return true; const n = raw.split('@')[0].split(':')[0]; return !!n && botNums.has(n); }
function collectAllIds(node, ids = new Set()) {
  if (!node || typeof node !== 'object') return ids; const id = node.stanzaId || node.quotedMessageId || node.id; if (id) ids.add(String(id));
  for (const val of Object.values(node)) if (val && typeof val === 'object') collectAllIds(val, ids); return ids;
}
function isBotMessageReplied(msg) {
  const m = unwrap(msg?.message); const contextInfo = contextOf(m); if (!contextInfo) return false;
  for (const id of collectAllIds(contextInfo)) if (botMessageKeys.has(id)) return true;
  const participantValues = [contextInfo.participant, contextInfo.participantPn, contextInfo.participantAlt, contextInfo.quotedMessage?.key?.participant, contextInfo.quotedMessage?.key?.participantPn, contextInfo.quotedMessage?.key?.participantAlt].filter(Boolean);
  if (participantValues.some(sameBotIdentity)) return true;
  if (contextInfo.quotedMessage?.key?.fromMe === true) return true;
  const nestedKey = contextInfo.quotedMessage?.key; if (nestedKey && sameBotIdentity(nestedKey.participant)) return true;
  return false;
}
function clearOldMessages() { if (botMessageKeys.size > 5000) { const arr = Array.from(botMessageKeys.keys()); arr.slice(0, 2500).forEach(k => botMessageKeys.delete(k)); } }
setInterval(clearOldMessages, 3600000);
module.exports = { addBotMessage, registerBotJids, isBotMessageReplied, clearOldMessages };
