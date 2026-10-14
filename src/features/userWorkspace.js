// userWorkspace.js — isolated per-user workspace under storage/workspaces/{userId}/
const fs = require('fs');
const path = require('path');
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');

const ROOT = path.join(__dirname, '..', '..', 'storage', 'workspaces');
fs.mkdirSync(ROOT, { recursive: true });
const memory = new Collection('user_repo_memory', {});

function userId(jidOrNum) {
  return numFromJid(jidOrNum) || String(jidOrNum || 'anon').replace(/[^\w.-]/g, '_');
}
function workspaceRoot(jidOrNum) {
  const dir = path.join(ROOT, userId(jidOrNum));
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'repos'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tmp'), { recursive: true });
  return dir;
}
function repoDir(jidOrNum, owner, repo) {
  const safe = `${String(owner).replace(/[^\w.-]/g, '_')}_${String(repo).replace(/[^\w.-]/g, '_')}`;
  const dir = path.join(workspaceRoot(jidOrNum), 'repos', safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getMemory(jidOrNum) { return memory.get(userId(jidOrNum), { repos: [] }); }
function rememberRepo(jidOrNum, entry) {
  const id = userId(jidOrNum), cur = memory.get(id, { repos: [] });
  if (!Array.isArray(cur.repos)) cur.repos = [];
  const key = `${entry.owner}/${entry.repo}`.toLowerCase();
  cur.repos = cur.repos.filter((r) => `${r.owner}/${r.repo}`.toLowerCase() !== key);
  cur.repos.unshift({ owner: entry.owner, repo: entry.repo, path: entry.path || null, hasToken: !!entry.hasToken, lastError: entry.lastError || null, lastCommit: entry.lastCommit || null, updatedAt: Date.now() });
  cur.repos = cur.repos.slice(0, 20); memory.set(id, cur); return cur;
}
function findRepo(jidOrNum, query) {
  const q = String(query || '').toLowerCase().trim(), cur = getMemory(jidOrNum);
  if (!q) return cur.repos[0] || null;
  return cur.repos.find((r) => `${r.owner}/${r.repo}`.toLowerCase() === q) ||
    cur.repos.find((r) => r.repo.toLowerCase() === q) ||
    cur.repos.find((r) => `${r.owner}/${r.repo}`.toLowerCase().includes(q)) || null;
}
function listFiles(dir, max = 80) {
  const out = [];
  const walk = (d) => {
    if (out.length >= max) return;
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (out.length >= max) break;
      if (['node_modules', '.git', 'dist', 'build', '.next', '__MACOSX'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(path.relative(dir, p).replace(/\\/g, '/'));
    }
  };
  walk(dir); return out;
}
module.exports = { ROOT, userId, workspaceRoot, repoDir, getMemory, rememberRepo, findRepo, listFiles };
