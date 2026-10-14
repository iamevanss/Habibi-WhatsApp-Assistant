'use strict';
const fs = require('fs/promises');
const path = require('path');
function safeName(name) { const value = String(name || '').trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 100); if (!value) throw new Error('A valid note name is required'); return value + '.md'; }
async function writeNote(vaultDir, name, content) { const root = path.resolve(vaultDir); const file = path.resolve(root, safeName(name)); if (!file.startsWith(root + path.sep)) throw new Error('Invalid note path'); await fs.mkdir(root, { recursive: true }); await fs.writeFile(file, String(content ?? ''), 'utf8'); return file; }
async function readNote(vaultDir, name) { const root = path.resolve(vaultDir); const file = path.resolve(root, safeName(name)); if (!file.startsWith(root + path.sep)) throw new Error('Invalid note path'); return fs.readFile(file, 'utf8'); }
module.exports = { writeNote, readNote, safeName };
