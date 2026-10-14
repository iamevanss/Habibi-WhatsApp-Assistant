// features/assemblyai.js — speech-to-text via AssemblyAI.
const fs = require('fs'); const path = require('path'); const os = require('os'); const axios = require('axios');
const { execFile } = require('child_process'); const { promisify } = require('util'); const execFileP = promisify(execFile);
const config = require('../config'); const logger = require('../logger');
function apiKey() { return config.integrations?.assemblyAiKey || process.env.ASSEMBLYAI_API_KEY || ''; }
function headers() { return { authorization: apiKey(), 'content-type': 'application/json' }; }
async function toWav(buffer) {
  const ffmpeg = process.env.FFMPEG_BIN || (() => { try { return require('ffmpeg-static'); } catch { return 'ffmpeg'; } })();
  const inFile = path.join(os.tmpdir(), `aai_in_${Date.now()}.ogg`); const outFile = path.join(os.tmpdir(), `aai_${Date.now()}.wav`);
  fs.writeFileSync(inFile, buffer);
  try { await execFileP(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', inFile, '-ar', '16000', '-ac', '1', outFile], { timeout: 60000 }); return { wav: fs.readFileSync(outFile), inFile, outFile }; }
  finally { try { fs.unlinkSync(inFile); } catch {} try { fs.unlinkSync(outFile); } catch {} }
}
async function transcribe(buffer) {
  const key = apiKey(); if (!key || !buffer || !Buffer.isBuffer(buffer) || buffer.length < 32) return null;
  try {
    let payload = buffer;
    try { const converted = await toWav(buffer); if (converted?.wav?.length) payload = converted.wav; } catch {}
    const up = await axios.post('https://api.assemblyai.com/v2/upload', payload, { headers: { authorization: key, 'content-type': 'application/octet-stream' }, timeout: 120000, maxContentLength: Infinity, maxBodyLength: Infinity });
    const uploadUrl = up.data?.upload_url; if (!uploadUrl) return null;
    const { data: job } = await axios.post('https://api.assemblyai.com/v2/transcript', { audio_url: uploadUrl, language_detection: true }, { headers: headers(), timeout: 60000 });
    const id = job?.id; if (!id) return null;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const { data: st } = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: headers(), timeout: 30000 });
      if (st.status === 'completed') return (st.text || '').trim() || null;
      if (st.status === 'error') { logger.warn({ err: st.error }, 'assemblyai transcript error'); return null; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return null;
  } catch (e) { logger.warn({ err: e.message }, 'assemblyai transcribe failed'); return null; }
}
module.exports = { transcribe, apiKey };
