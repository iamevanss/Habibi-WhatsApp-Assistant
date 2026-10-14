// features/gitOps.js — clean git operations for the bot's AI tools
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);
async function gitExec(args, cwd, timeoutMs = 30000) {
  const { stdout, stderr } = await execFileP('git', args, { cwd, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
async function gitStatus(cwd) {
  const { stdout } = await gitExec(['status', '--porcelain'], cwd);
  const lines = stdout.split('\n').filter(Boolean);
  return { ok: true, dirty: lines.length > 0, files: lines.slice(0, 30) };
}
async function gitCommitPush(opts = {}) {
  const cwd = opts.cwd || process.cwd(), message = String(opts.message || '').trim();
  if (!message) return { ok: false, error: 'Commit message required.' };
  const branch = opts.branch || 'main';
  try {
    await gitExec(['add', '-A'], cwd);
    const status = await gitExec(['status', '--porcelain'], cwd);
    if (!status.stdout) return { ok: false, error: 'Nothing to commit — working tree clean.' };
    const commit = await gitExec(['commit', '-m', message], cwd, 60000);
    let pushResult;
    try { pushResult = await gitExec(['push', 'origin', branch], cwd, 60000); }
    catch (pushErr) {
      try { pushResult = await gitExec(['push'], cwd, 60000); }
      catch (e2) { return { ok: true, committed: true, pushed: false, commitMsg: commit.stdout, pushError: pushErr.message || e2.message }; }
    }
    let hash = '';
    try { hash = (await gitExec(['rev-parse', '--short', 'HEAD'], cwd)).stdout; } catch {}
    return { ok: true, committed: true, pushed: true, hash, commitMsg: commit.stdout, push: pushResult.stdout };
  } catch (e) { return { ok: false, error: e.message }; }
}
async function gitClone(repoUrl, destDir) {
  const { stdout, stderr } = await execFileP('git', ['clone', repoUrl, destDir], { timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  return { ok: true, path: destDir, output: stdout || stderr };
}
module.exports = { gitStatus, gitCommitPush, gitClone, gitExec };
