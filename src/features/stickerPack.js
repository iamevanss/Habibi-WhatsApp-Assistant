// features/stickerPack.js — collect stickers into a downloadable zip pack
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');
const packs = new Collection('sticker_packs', {});
function packKey(userJid, name) { return `${numFromJid(userJid)}:${String(name || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32)}`; }
function add(userJid, name, buffer) {
  if (!buffer || !buffer.length) return { ok: false, error: 'Empty sticker' };
  const key = packKey(userJid, name), pack = packs.get(key, { name: name || 'default', items: [], updated: Date.now() });
  if (pack.items.length >= 30) return { ok: false, error: 'Pack full (30 stickers max)' };
  const file = path.join(os.tmpdir(), `stkpack_${Date.now()}_${pack.items.length}.webp`); fs.writeFileSync(file, buffer);
  pack.items.push({ file, at: Date.now() }); pack.updated = Date.now(); packs.set(key, pack);
  return { ok: true, count: pack.items.length, name: pack.name };
}
function list(userJid) { const uid = numFromJid(userJid); return Object.entries(packs.all() || {}).filter(([k]) => k.startsWith(uid + ':')).map(([k, p]) => ({ key: k, name: p.name, count: (p.items || []).length })); }
async function exportZip(userJid, name) {
  const key = packKey(userJid, name), pack = packs.get(key, null);
  if (!pack || !(pack.items || []).length) return { ok: false, error: 'Pack empty or missing' };
  const AdmZip = require('adm-zip'), zip = new AdmZip(); let n = 0;
  for (const it of pack.items) if (it.file && fs.existsSync(it.file)) zip.addLocalFile(it.file, '', `sticker_${++n}.webp`);
  if (!n) return { ok: false, error: 'No sticker files on disk (restart may clear temp files)' };
  const out = path.join(os.tmpdir(), `pack_${numFromJid(userJid)}_${Date.now()}.zip`); zip.writeZip(out);
  return { ok: true, file: out, buffer: fs.readFileSync(out), count: n, name: pack.name };
}
function clear(userJid, name) { packs.delete(packKey(userJid, name)); return { ok: true }; }
module.exports = { add, list, exportZip, clear };
