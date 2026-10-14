// Small utilities for writing and validating generated website files.
const fs = require('fs');
const path = require('path');

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SAFE_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.md', '.svg', '.txt', '.png', '.jpg', '.jpeg', '.webp']);

function resolveInside(root, relativePath) {
  const base = path.resolve(root);
  const target = path.resolve(base, String(relativePath || ''));
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error('Path escapes project root');
  return target;
}

function validateFile(relativePath, content) {
  const ext = path.extname(relativePath).toLowerCase();
  if (!SAFE_EXTENSIONS.has(ext)) throw new Error(`Unsupported website file type: ${ext || '(none)'}`);
  const bytes = Buffer.byteLength(String(content), 'utf8');
  if (bytes > MAX_FILE_BYTES) throw new Error('Website file exceeds 2 MB limit');
  return { path: relativePath, bytes, extension: ext };
}

function writeSiteFiles(root, files) {
  const base = path.resolve(root);
  fs.mkdirSync(base, { recursive: true });
  const written = [];
  for (const item of files || []) {
    if (!item || typeof item.path !== 'string') throw new Error('Each file needs a relative path');
    const info = validateFile(item.path, item.content ?? '');
    const dest = resolveInside(base, item.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, String(item.content ?? ''), 'utf8');
    written.push({ ...info, absolutePath: dest });
  }
  return written;
}

function listSiteFiles(root) {
  const base = path.resolve(root);
  const out = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'));
    }
  }
  if (fs.existsSync(base)) walk(base);
  return out.sort();
}

module.exports = { resolveInside, validateFile, writeSiteFiles, listSiteFiles, MAX_FILE_BYTES, SAFE_EXTENSIONS };
