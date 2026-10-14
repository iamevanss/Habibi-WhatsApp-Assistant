'use strict';
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const exec = promisify(execFile);
function runtimeInfo() { return { node: process.version, platform: process.platform, arch: process.arch, pid: process.pid, uptime: process.uptime(), memory: process.memoryUsage(), hostname: os.hostname() }; }
async function gitStatus(cwd = process.cwd()) { const { stdout } = await exec('git', ['status', '--short', '--branch'], { cwd, timeout: 5000, maxBuffer: 100000 }); return stdout.trim(); }
function redact(value) { return String(value ?? '').replace(/(token|password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]'); }
module.exports = { runtimeInfo, gitStatus, redact };
