// Text-to-speech wrapper. Requires optional 'say' or 'edge-tts' executable to be installed.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function speak(text, options = {}) {
  const value = String(text || '').trim();
  if (!value) throw new Error('Text is empty');
  if (value.length > 4000) throw new Error('Text is too long for speech generation');
  const output = path.join(os.tmpdir(), `habibi-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
  const voice = String(options.voice || process.env.TTS_VOICE || 'en-GB-SoniaNeural');
  const rate = String(options.rate || '+0%');
  try {
    await execFileAsync('edge-tts', ['--voice', voice, '--rate', rate, '--text', value, '--write-media', output], { timeout: 90000, maxBuffer: 1024 * 1024 });
    if (!fs.existsSync(output) || fs.statSync(output).size === 0) throw new Error('TTS produced no audio file');
    return { file: output, mimetype: 'audio/mpeg' };
  } catch (error) {
    try { fs.unlinkSync(output); } catch {}
    throw new Error(`TTS unavailable: ${error.message}`);
  }
}
async function toWhatsAppVoice(file) {
  const output = file.replace(/\.[^.]+$/, '') + '.ogg';
  await execFileAsync('ffmpeg', ['-y', '-i', file, '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'voip', output], { timeout: 90000 });
  if (!fs.existsSync(output) || fs.statSync(output).size === 0) throw new Error('Voice conversion produced no file');
  return { buffer: fs.readFileSync(output), file: output, mimetype: 'audio/ogg; codecs=opus', ptt: true };
}
module.exports = { speak, toWhatsAppVoice };
