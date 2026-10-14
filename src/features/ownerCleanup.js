// features/ownerCleanup.js — owner-only storage cleanup (stickers, builds, fixes, temp downloads)
const fs = require('fs'); const path = require('path'); const os = require('os');
const stickers = require('./stickers'); const lastBuild = require('../core/lastBuild'); const zipMemory = require('./zipMemory'); const logger = require('../logger');
const ROOT = path.join(__dirname, '..', '..'); const STORAGE = path.join(ROOT, 'storage');
function dirSize(dir) {
  let bytes = 0, files = 0;
  const walk = (d) => { let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of ents) { const p = path.join(d, e.name); try { if (e.isDirectory()) walk(p); else { bytes += fs.statSync(p).size; files++; } } catch {} } };
  walk(dir); return { bytes, files };
}
function clearDir(dir, { prefix, olderThanMs, extensions } = {}) {
  let removed = 0, bytes = 0; const now = Date.now(); let ents; try { ents = fs.readdirSync(dir); } catch { return { removed: 0, bytes: 0 }; }
  for (const name of ents) { if (prefix && !name.startsWith(prefix)) continue; const p = path.join(dir, name); try { const st = fs.statSync(p); if (st.isDirectory()) continue; if (extensions?.length && !extensions.includes(path.extname(name).toLowerCase())) continue; if (olderThanMs && now - st.mtimeMs < olderThanMs) continue; bytes += st.size; fs.unlinkSync(p); removed++; } catch {} }
  return { removed, bytes };
}
function fmtBytes(n) { if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`; return `${(n / (1024 * 1024)).toFixed(1)} MB`; }
function status() {
  const stickerCount = stickers.count(); const stickerDir = stickers.STORAGE_DIR || path.join(STORAGE, 'stickers');
  const builds = dirSize(lastBuild.BUILD_DIR || path.join(STORAGE, 'builds')); const fixes = dirSize(zipMemory.FIX_DIR || path.join(STORAGE, 'fixes')); const stickerDisk = dirSize(stickerDir); const tmp = dirSize(os.tmpdir());
  return { stickers: { count: stickerCount, ...stickerDisk }, builds, fixes, tmpApprox: tmp };
}
function cleanup(opts = {}) {
  const all = !!opts.all; const report = []; let totalRemoved = 0, totalBytes = 0;
  if (all || opts.stickers) { const r = stickers.clearAll(); totalRemoved += r.removed; totalBytes += r.bytes; report.push(`Stickers: deleted ${r.removed} file(s) (${fmtBytes(r.bytes)})`); }
  if (all || opts.builds) { const r = lastBuild.clearBuildZips(); totalRemoved += r.removed; totalBytes += r.bytes; report.push(`Build zips: deleted ${r.removed} file(s) (${fmtBytes(r.bytes)})`); }
  if (all || opts.fixes) { const r = zipMemory.clearFixZips(); totalRemoved += r.removed; totalBytes += r.bytes; report.push(`Fix zips: deleted ${r.removed} file(s) (${fmtBytes(r.bytes)})`); }
  const SESSIONS_DIR = path.join(ROOT, 'sessions'); const PROTECTED = new Set([path.resolve(SESSIONS_DIR), path.resolve(path.join(ROOT, 'auth')), path.resolve(path.join(ROOT, 'baileys_auth'))]);
  if (all || opts.temp) {
    const prefixes = ['broken_last_', 'broken_fix', 'site-', 'sitef-', 'dl_', 'vin_', 'vout_', 'site_', 'wa_', 'br_', 'host_', 'send_', 'vn_', 'mp3_', 'in_'];
    let removed = 0, bytes = 0; const tmp = os.tmpdir();
    try { for (const name of fs.readdirSync(tmp)) { if (/session|creds|app-state|auth_info|baileys/i.test(name)) continue; if (!prefixes.some((p) => name.startsWith(p))) continue; const p = path.join(tmp, name); if (PROTECTED.has(path.resolve(p))) continue;
      try { const st = fs.statSync(p); if (st.isDirectory()) { const size = dirSize(p); fs.rmSync(p, { recursive: true, force: true }); removed += size.files || 1; bytes += size.bytes; } else { bytes += st.size; fs.unlinkSync(p); removed++; } } catch {} } } catch {}
    totalRemoved += removed; totalBytes += bytes; report.push(`Temp bot files: deleted ${removed} item(s) (${fmtBytes(bytes)})`);
  }
  if (!report.length) return { ok: false, error: 'Specify what to clear: stickers, builds, fixes, temp, or all.' };
  logger.info({ totalRemoved, totalBytes, report }, 'owner cleanup'); report.push('🔒 sessions/ auth was NOT touched (WhatsApp login preserved).');
  return { ok: true, removed: totalRemoved, bytes: totalBytes, human: `${report.join('\n')}\n\nTotal: ${totalRemoved} items, ${fmtBytes(totalBytes)}`, report };
}
module.exports = { cleanup, status, fmtBytes, clearDir, dirSize };
