'use strict';
// Channel helpers for WhatsApp channel updates.
function normalizeJid(value) { return String(value || '').trim(); }
function isChannelJid(value) { return /@newsletter$/.test(normalizeJid(value)); }
function validateChannel(value) {
  const jid = normalizeJid(value);
  return { ok: isChannelJid(jid), jid, error: isChannelJid(jid) ? null : 'Provide a valid WhatsApp channel JID ending in @newsletter.' };
}
function buildText(text) {
  const value = String(text || '').trim();
  if (!value) throw new Error('Channel update text cannot be empty.');
  if (value.length > 4000) throw new Error('Channel update text is too long.');
  return { text: value };
}
async function sendUpdate(sock, channelJid, text) {
  if (!sock || typeof sock.sendMessage !== 'function') throw new Error('WhatsApp connection is unavailable.');
  const channel = validateChannel(channelJid);
  if (!channel.ok) throw new Error(channel.error);
  return sock.sendMessage(channel.jid, buildText(text));
}
module.exports = { normalizeJid, isChannelJid, validateChannel, buildText, sendUpdate };
