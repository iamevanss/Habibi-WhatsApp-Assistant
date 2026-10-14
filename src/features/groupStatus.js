// Group status posting and group-wide status broadcasting for Habibi.
// Uses the requested Baileys 7.0.0-rc11 APIs and keeps these as agent tools.
const { downloadContentFromMessage, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const COLORS = [0xff1a2a3a, 0xff2c3e50, 0xff8e44ad, 0xff2980b9, 0xff27ae60];
const randomBg = () => COLORS[Math.floor(Math.random() * COLORS.length)];
function unwrap(message) {
  let m = message || null;
  for (let i = 0; i < 4 && m; i++) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    else break;
  }
  return m || {};
}
async function readMedia(msg, kind) {
  const stream = await downloadContentFromMessage(msg, kind);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function buildStatus(sock, text, quotedMessage) {
  const quoted = unwrap(quotedMessage);
  if (quoted.imageMessage) {
    const buffer = await readMedia(quoted.imageMessage, 'image');
    const prepared = await prepareWAMessageMedia({ image: buffer, caption: text || '' }, { upload: sock.waUploadToServer });
    return { groupStatusMessageV2: { message: prepared } };
  }
  if (quoted.videoMessage) {
    const buffer = await readMedia(quoted.videoMessage, 'video');
    const prepared = await prepareWAMessageMedia({ video: buffer, caption: text || '' }, { upload: sock.waUploadToServer });
    return { groupStatusMessageV2: { message: prepared } };
  }
  const message = String(text || '').trim();
  if (!message) throw new Error('Give Habibi text to post, or reply to an image/video with a caption or no caption.');
  const ext = { text: message, backgroundArgb: randomBg(), font: 0 };
  const url = message.match(/https?:\/\/[^\s]+/);
  if (url) Object.assign(ext, { matchedText: url[0], canonicalUrl: url[0], title: 'Link Preview', previewType: 1 });
  return { groupStatusMessageV2: { message: { extendedTextMessage: ext } } };
}
async function postToGroup(sock, jid, content) {
  if (!String(jid || '').endsWith('@g.us')) throw new Error('Target must be a WhatsApp group.');
  const status = generateWAMessageFromContent(jid, content, { userJid: sock.user.id });
  await sock.relayMessage(jid, status.message, { messageId: status.key.id });
}
async function postGroupStatus(sock, jid, text, quotedMessage) {
  const content = await buildStatus(sock, text, quotedMessage);
  await postToGroup(sock, jid, content);
  return { ok: true, groupJid: jid, type: unwrap(quotedMessage).imageMessage ? 'image' : unwrap(quotedMessage).videoMessage ? 'video' : 'text' };
}
async function broadcastGroupStatus(sock, text, quotedMessage) {
  const groups = await sock.groupFetchAllParticipating();
  const jids = Object.keys(groups || {});
  if (!jids.length) return { ok: true, posted: 0, failed: 0, note: 'Habibi is not in any groups.' };
  const content = await buildStatus(sock, text, quotedMessage);
  let posted = 0, failed = 0;
  for (const jid of jids) {
    try { await postToGroup(sock, jid, content); posted++; } catch { failed++; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return { ok: failed === 0, posted, failed, total: jids.length };
}
module.exports = { postGroupStatus, broadcastGroupStatus };
