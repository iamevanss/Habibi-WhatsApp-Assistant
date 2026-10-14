// core/lastBuild.js — remembers the most recently generated file set per chat.
// Persisted to disk so restarts / "send it again" still work.
const fs = require('fs');
const path = require('path');
const { Collection } = require('../db');
const store = new Collection('last_builds', {});
const BUILD_DIR = path.join(__dirname, '..', '..', 'storage', 'builds');
if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
function chatKey(chatId) { return String(chatId || '').replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 120); }
function set(chatId, data) {
  const key = chatKey(chatId);
  const entry = { ...data, files: Array.isArray(data.files) ? data.files.map((f) => ({ name: f.name, code: data.keepCode === false ? undefined : f.code })) : data.files, at: Date.now() };
  if (entry.zipPath && entry.files && entry.files.length > 30) entry.files = entry.files.map((f) => ({ name: f.name }));
  store.set(key, entry); return entry;
}
function get(chatId) { return store.get(chatKey(chatId), null); }
function saveZip(chatId, srcPath, { name = 'project', kind = 'website' } = {}) {
  const key = chatKey(chatId), dest = path.join(BUILD_DIR, `${key}_${kind}_${Date.now()}.zip`);
  try {
    fs.copyFileSync(srcPath, dest);
    try { for (const f of fs.readdirSync(BUILD_DIR)) if (f.startsWith(`${key}_`) && path.join(BUILD_DIR, f) !== dest) { try { fs.unlinkSync(path.join(BUILD_DIR, f)); } catch {} } } catch {}
    return dest;
  } catch { return srcPath; }
}
function getZipPath(chatId) {
  const e = get(chatId);
  if (e?.zipPath && fs.existsSync(e.zipPath)) return e.zipPath;
  try { const p = global.__brokenLastBuildZipPath?.get?.(chatId); if (p && fs.existsSync(p)) return p; } catch {}
  return null;
}
function listBuilds(limit = 20) {
  let files = [];
  try { files = fs.readdirSync(BUILD_DIR).map((f) => { const p = path.join(BUILD_DIR, f), st = fs.statSync(p); return { file: f, path: p, size: st.size, mtime: st.mtimeMs }; }); } catch {}
  return files.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}
function clearBuildZips() {
  let removed = 0, bytes = 0;
  try { for (const f of fs.readdirSync(BUILD_DIR)) { const p = path.join(BUILD_DIR, f); try { bytes += fs.statSync(p).size; fs.unlinkSync(p); removed++; } catch {} } } catch {}
  return { removed, bytes };
}
module.exports = { set, get, saveZip, getZipPath, listBuilds, clearBuildZips, BUILD_DIR };
