// features/audioConvert.js — converts audio buffers to WAV or FLAC using ffmpeg.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
function ffmpegBin() { if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN; try { return require('ffmpeg-static'); } catch {} return 'ffmpeg'; }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-audioconv-'));
const BIT_DEPTHS = { 16: 'pcm_s16le', 24: 'pcm_s24le', 32: 'pcm_s32le' };
async function convert(inputBuffer, opts = {}) {
  const format = opts.format === 'flac' ? 'flac' : 'wav';
  let bitDepth = opts.bitDepth || 16;
  if (format === 'flac' && bitDepth === 32) bitDepth = 24;
  const inFile = path.join(TMP, `in_${Date.now()}.audio`), outFile = path.join(TMP, `out_${Date.now()}.${format}`);
  fs.writeFileSync(inFile, inputBuffer);
  const args = ['-y', '-i', inFile];
  if (format === 'wav') args.push('-c:a', BIT_DEPTHS[bitDepth] || 'pcm_s16le');
  else args.push('-c:a', 'flac', '-sample_fmt', bitDepth === 24 ? 's32' : 's16', '-bits_per_raw_sample', String(bitDepth));
  args.push(outFile);
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegBin(), args); let stderr = '';
      proc.stderr.on('data', d => { stderr += d; }); proc.on('error', reject);
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`)));
    });
  } finally { fs.unlink(inFile, () => {}); }
  if (!fs.existsSync(outFile)) throw new Error('Conversion produced no output file.');
  return { file: outFile, format };
}
module.exports = { convert };
