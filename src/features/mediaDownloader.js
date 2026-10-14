'use strict';
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs/promises');
const exec = promisify(execFile);
async function downloadMedia(url, outputDir = path.resolve(process.cwd(), 'downloads')) { let parsed; try { parsed = new URL(url); } catch { throw new Error('A valid URL is required'); } if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Only HTTP(S) URLs are supported'); await fs.mkdir(outputDir, { recursive: true }); const template = path.join(outputDir, '%(title).80s-%(id)s.%(ext)s'); const { stdout, stderr } = await exec('yt-dlp', ['--no-playlist', '--max-filesize', '50M', '-o', template, parsed.href], { timeout: 120000, maxBuffer: 1024 * 1024 }); return { stdout: stdout.trim(), stderr: stderr.trim(), outputDir }; }
module.exports = { downloadMedia };
