// features/gofile.js — upload files to GoFile and return a public download link.
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const logger = require('../logger');

async function getServer() {
  const { data } = await axios.get('https://api.gofile.io/servers', { timeout: 20000 });
  const servers = data?.data?.servers || data?.data || [];
  if (Array.isArray(servers) && servers.length) {
    const s = servers[0];
    return typeof s === 'string' ? s : (s.name || s.server || 'store1');
  }
  return 'store1';
}

/**
 * Upload a local file path or Buffer to GoFile.
 * @returns {{ ok, url, downloadPage, fileId, fileName }}
 */
async function upload(filePathOrBuffer, fileName = 'file.bin') {
  const token = config.integrations?.gofileToken || process.env.GOFILE_TOKEN;
  if (!token) return { ok: false, error: 'GOFILE_TOKEN is not set in .env' };

  let tmpPath = null;
  let uploadPath = filePathOrBuffer;
  if (Buffer.isBuffer(filePathOrBuffer)) {
    const os = require('os');
    tmpPath = path.join(os.tmpdir(), `gofile_${Date.now()}_${fileName}`);
    fs.writeFileSync(tmpPath, filePathOrBuffer);
    uploadPath = tmpPath;
  }
  if (!uploadPath || !fs.existsSync(uploadPath)) {
    return { ok: false, error: 'File not found for GoFile upload' };
  }

  try {
    const server = await getServer();
    const FormData = (() => { try { return require('form-data'); } catch { return null; } })();
    const axiosOpts = { timeout: 300000, maxContentLength: Infinity, maxBodyLength: Infinity };

    let data;
    if (FormData) {
      const form = new FormData();
      form.append('file', fs.createReadStream(uploadPath), { filename: fileName });
      form.append('token', token);
      const res = await axios.post(`https://${server}.gofile.io/contents/uploadfile`, form, {
        ...axiosOpts,
        headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
      });
      data = res.data;
    } else {
      // Manual multipart
      const boundary = '----gofile' + Date.now();
      const fileBuf = fs.readFileSync(uploadPath);
      const parts = [];
      const push = (s) => parts.push(Buffer.isBuffer(s) ? s : Buffer.from(s));
      push(`--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n`);
      push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
      push(fileBuf);
      push(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat(parts);
      const res = await axios.post(`https://${server}.gofile.io/contents/uploadfile`, body, {
        ...axiosOpts,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
      });
      data = res.data;
    }

    const d = data?.data || data || {};
    const url = d.downloadPage || d.link || d.directLink || d.file?.downloadPage;
    if (!url && data?.status !== 'ok' && data?.status !== 'success') {
      return { ok: false, error: data?.message || data?.status || 'GoFile upload failed' };
    }
    return {
      ok: true,
      url: url || null,
      downloadPage: d.downloadPage || url,
      fileId: d.fileId || d.id || d.file?.id,
      fileName: d.fileName || d.name || fileName,
      raw: d,
    };
  } catch (e) {
    logger.warn({ err: e.message }, 'gofile upload failed');
    return { ok: false, error: e.response?.data?.message || e.message };
  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
  }
}

module.exports = { upload, getServer };
