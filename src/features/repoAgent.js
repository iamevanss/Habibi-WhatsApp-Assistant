'use strict';
// Repository task helpers. This module intentionally does not execute arbitrary code.
function parseRepo(input) {
  const value = String(input || '').trim().replace(/\.git$/i, '');
  const match = value.match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+)$/i);
  if (!match) return { ok: false, error: 'Use owner/repository or a GitHub repository URL.' };
  return { ok: true, owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}
function summarizeFiles(files = []) {
  return (Array.isArray(files) ? files : []).map(file => ({
    path: String(file.path || ''),
    status: String(file.status || 'unknown'),
    additions: Number(file.additions) || 0,
    deletions: Number(file.deletions) || 0,
  }));
}
function buildIssue({ title, body = '', labels = [] } = {}) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Issue title is required.');
  return { title: cleanTitle.slice(0, 256), body: String(body || '').slice(0, 60000), labels: Array.isArray(labels) ? labels.map(String).slice(0, 10) : [] };
}
module.exports = { parseRepo, summarizeFiles, buildIssue };
