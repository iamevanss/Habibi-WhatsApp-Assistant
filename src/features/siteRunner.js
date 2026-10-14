'use strict';
const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
async function runScript(file, args = [], options = {}) { const root = path.resolve(options.root || process.cwd()); const target = path.resolve(root, file); if (!target.startsWith(root + path.sep)) throw new Error('Path is outside the allowed project directory'); const stat = await fs.stat(target); if (!stat.isFile()) throw new Error('Target is not a file'); const ext = path.extname(target).toLowerCase(); const runtimes = { '.js': process.execPath, '.mjs': process.execPath, '.cjs': process.execPath, '.py': 'python3' }; if (!runtimes[ext]) throw new Error('Only JavaScript and Python scripts are supported'); return execFileAsync(runtimes[ext], [target, ...args.map(String)], { cwd: root, timeout: Math.min(30000, Number(options.timeout) || 10000), maxBuffer: 1024 * 1024 }); }
module.exports = { runScript };
