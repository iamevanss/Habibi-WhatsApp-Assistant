const { spawn } = require('node:child_process');
const path = require('node:path');

function runProject(command, args = [], options = {}) {
  if (typeof command !== 'string' || !command.trim()) {
    throw new TypeError('A command is required');
  }
  const cwd = path.resolve(options.cwd || process.cwd());
  const timeout = Math.max(1000, Number(options.timeout) || 30000);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args.map(String), {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, cwd });
    });
  });
}

module.exports = { runProject };
