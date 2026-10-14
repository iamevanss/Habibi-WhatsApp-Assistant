// selfheal.js — guarded self-repair + health diagnostics.
const fs = require('fs'); const path = require('path'); const { execFile } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'); const SRC = path.join(ROOT, 'src'); const BACKUP_ROOT = path.join(ROOT, '.selfheal-backups');
function run(cmd, args = [], timeout = 20000) {
  return new Promise((resolve) => execFile(cmd, args, { cwd: ROOT, timeout, maxBuffer: 1024 * 1024 * 4 }, (error, stdout, stderr) => resolve({ ok: !error, code: error?.code || 0, stdout: String(stdout || ''), stderr: String(stderr || '') })));
}
function safePath(p) { const abs = path.resolve(ROOT, p); return abs.startsWith(SRC + path.sep) && !abs.includes(`${path.sep}node_modules${path.sep}`); }
async function healthCheck() {
  const files = []; const walk = (dir) => { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, ent.name); if (ent.isDirectory()) walk(p); else if (/\.(js|cjs)$/.test(ent.name)) files.push(p); } };
  walk(SRC); const failures = [];
  for (const file of files) { const r = await run(process.execPath, ['--check', file], 10000); if (!r.ok) failures.push({ file: path.relative(ROOT, file), error: r.stderr || r.stdout }); }
  return { ok: failures.length === 0, checked: files.length, failures };
}
async function repair(aiClient, reason = 'health check failed') {
  const health = await healthCheck(); if (health.ok) return { ok: true, repaired: false, message: `Health check passed (${health.checked} JS files).` };
  fs.mkdirSync(BACKUP_ROOT, { recursive: true }); const backupDir = path.join(BACKUP_ROOT, String(Date.now())); fs.mkdirSync(backupDir, { recursive: true });
  const targets = health.failures.slice(0, 3); const changed = [];
  for (const failure of targets) {
    if (!safePath(failure.file)) continue;
    const abs = path.resolve(ROOT, failure.file); const content = fs.readFileSync(abs, 'utf8');
    fs.mkdirSync(path.dirname(path.join(backupDir, failure.file)), { recursive: true }); fs.copyFileSync(abs, path.join(backupDir, failure.file));
    const prompt = `Repair this Node.js source file. Reason: ${reason}\nSyntax error: ${failure.error}\n\nFILE: ${failure.file}\n${content}\n\nReturn ONLY the complete corrected file content. Do not change unrelated behavior.`;
    let fixed; try { fixed = await aiClient.simpleComplete(prompt, 'You are a conservative production JavaScript repair agent. Return complete code only.'); } catch { continue; }
    if (!fixed || fixed.length < 20) continue;
    fixed = fixed.replace(/^```(?:javascript|js)?\s*/i, '').replace(/```\s*$/, '').trim(); fs.writeFileSync(abs, fixed, 'utf8');
    const check = await run(process.execPath, ['--check', abs], 10000);
    if (check.ok) changed.push(failure.file); else fs.copyFileSync(path.join(backupDir, failure.file), abs);
  }
  const after = await healthCheck(); return { ok: after.ok, repaired: changed.length > 0, changed, backupDir, health: after };
}
module.exports = { healthCheck, repair };
