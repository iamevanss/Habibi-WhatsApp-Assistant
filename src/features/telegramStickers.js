// features/telegramStickers.js — download public Telegram sticker packs by link/name
const fs = require('fs'); const path = require('path'); const os = require('os'); const axios = require('axios'); const logger = require('../logger');
function packNameFromInput(input) {
  const s = String(input || '').trim(); if (!s) return null;
  let m = s.match(/(?:t\.me|telegram\.me)\/addstickers\/([A-Za-z0-9_]+)/i); if (m) return m[1];
  m = s.match(/addstickers\/([A-Za-z0-9_]+)/i); if (m) return m[1];
  if (/^[A-Za-z0-9_]{3,64}$/.test(s)) return s; return null;
}
async function getStickerSet(name) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';
  if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in .env (any Telegram bot token works for public packs).');
  const { data } = await axios.get(`https://api.telegram.org/bot${token}/getStickerSet`, { params: { name }, timeout: 30000 });
  if (!data?.ok || !data.result) throw new Error(data?.description || 'getStickerSet failed'); return data.result;
}
async function downloadTelegramFile(token, fileId) {
  const { data: meta } = await axios.get(`https://api.telegram.org/bot${token}/getFile`, { params: { file_id: fileId }, timeout: 30000 });
  if (!meta?.ok || !meta.result?.file_path) throw new Error('getFile failed');
  const url = `https://api.telegram.org/file/bot${token}/${meta.result.file_path}`;
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 }); return Buffer.from(data);
}
async function downloadPack(input, { maxStickers = 20 } = {}) {
  const name = packNameFromInput(input); if (!name) throw new Error('Send a Telegram pack link like https://t.me/addstickers/PackName');
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN || ''; const set = await getStickerSet(name);
  const stickers = (set.stickers || []).slice(0, maxStickers); const out = [];
  for (const st of stickers) { try { const buf = await downloadTelegramFile(token, st.file_id); out.push({ buffer: buf, emoji: st.emoji || '', isAnimated: !!st.is_animated, isVideo: !!st.is_video }); } catch (e) { logger.warn({ err: e.message }, 'telegram sticker file failed'); } }
  return { name: set.name || name, title: set.title || name, count: out.length, stickers: out };
}
async function exportPackZip(input) {
  const pack = await downloadPack(input, { maxStickers: 50 }); const AdmZip = require('adm-zip'); const zip = new AdmZip(); let i = 0;
  for (const s of pack.stickers) { const ext = s.isVideo ? 'webm' : 'webp'; zip.addFile(`sticker_${++i}${s.emoji ? '_' + s.emoji : ''}.${ext}`, s.buffer); }
  const file = path.join(os.tmpdir(), `tgpack_${Date.now()}.zip`); zip.writeZip(file); return { ...pack, file, buffer: fs.readFileSync(file) };
}
module.exports = { packNameFromInput, downloadPack, exportPackZip };
