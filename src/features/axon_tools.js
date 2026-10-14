'use strict';
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const run = promisify(execFile);
function systemInfo() { return { platform: process.platform, arch: process.arch, node: process.version, uptimeSeconds: Math.floor(os.uptime()), freeMemory: os.freemem(), totalMemory: os.totalmem(), cpus: os.cpus().length }; }
async function commandExists(command) { try { await run('sh', ['-lc', 'command -v ' + String(command).replace(/[^a-zA-Z0-9_.+-]/g, '')], { timeout: 3000 }); return true; } catch { return false; } }
function formatBytes(value) { const units = ['B', 'KB', 'MB', 'GB', 'TB']; let n = Number(value) || 0, i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return n.toFixed(i ? 1 : 0) + ' ' + units[i]; }
module.exports = { systemInfo, commandExists, formatBytes };
