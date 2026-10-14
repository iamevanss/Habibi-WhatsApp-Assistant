// features/stickers.js — a little sticker collection. Every sticker the bot
// receives gets saved; it can then reply with a random one, or occasionally
// drop one into the chat unprompted.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { Collection } = require('../db');
const logger = require('../logger');

const STORAGE_DIR = path.join(__dirname, '..', '..', 'storage', 'stickers');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const index = new Collection('sticker_index', { items: [] }); // { id, file, chatId, senderId, savedAt }

/** Save a sticker buffer to disk and record it. De-dupes identical stickers by content hash. */
function saveSticker(buffer, { chatId, senderId } = {}) {
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const items = index.get('items', []);
  if (items.some((s) => s.id === hash)) {
    return { ok: true, duplicate: true, id: hash };
  }
  const file = path.join(STORAGE_DIR, `${hash}.webp`);
  fs.writeFileSync(file, buffer);
  const entry = { id: hash, file, chatId, senderId, savedAt: Date.now() };
  index.set('items', [...items, entry]);
  logger.info({ id: hash, total: items.length + 1 }, 'sticker saved');
  return { ok: true, duplicate: false, id: hash, total: items.length + 1 };
}

function count() {
  return (index.get('items', []) || []).length;
}

/** Returns a random saved sticker's buffer, or null if none saved yet. */
function getRandom() {
  const items = index.get('items', []) || [];
  if (!items.length) return null;
  const pick = items[Math.floor(Math.random() * items.length)];
  try {
    return fs.readFileSync(pick.file);
  } catch (e) {
    logger.warn({ err: e.message, id: pick.id }, 'sticker file missing, dropping from index');
    index.set('items', items.filter((s) => s.id !== pick.id));
    return getRandom();
  }
}

/**
 * Converts an arbitrary image buffer (jpg/png/webp/whatever sharp can read) into a
 * WhatsApp-ready sticker buffer: square 512x512 canvas, image contained (not cropped)
 * with a transparent pad, encoded as webp. Returns null if the input isn't a decodable
 * image (e.g. someone points make_sticker at a non-image).
 */
async function bufferToSticker(buffer) {
  try {
    return await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer();
  } catch (e) {
    logger.warn({ err: e.message }, 'sticker conversion failed');
    return null;
  }
}

function listStickers() {
  const items = index.get('items', []) || [];
  return items.map((s) => ({ id: s.id, file: s.file, chatId: s.chatId, savedAt: s.savedAt }));
}

/** Delete all saved stickers from disk and index. Returns counts. */
function clearAll() {
  const items = index.get('items', []) || [];
  let removed = 0;
  let bytes = 0;
  for (const s of items) {
    try {
      if (s.file && fs.existsSync(s.file)) {
        bytes += fs.statSync(s.file).size;
        fs.unlinkSync(s.file);
      }
      removed++;
    } catch {}
  }
  // wipe any orphan webp in storage dir
  try {
    for (const f of fs.readdirSync(STORAGE_DIR)) {
      const fp = path.join(STORAGE_DIR, f);
      try {
        if (fs.statSync(fp).isFile()) {
          bytes += fs.statSync(fp).size;
          fs.unlinkSync(fp);
        }
      } catch {}
    }
  } catch {}
  index.set('items', []);
  return { removed, bytes, remaining: 0 };
}

function clearMissing() {
  const items = index.get('items', []) || [];
  const keep = [];
  let dropped = 0;
  for (const s of items) {
    if (s.file && fs.existsSync(s.file)) keep.push(s);
    else dropped++;
  }
  index.set('items', keep);
  return { dropped, remaining: keep.length };
}

module.exports = { saveSticker, getRandom, count, bufferToSticker, listStickers, clearAll, clearMissing, STORAGE_DIR };
