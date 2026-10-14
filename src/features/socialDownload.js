// features/socialDownload.js — download videos from YT/FB/IG/TikTok/X via public APIs.
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { Collection } = require('../db');
const logger = require('../logger');
const { numFromJid } = require('../utils/helpers');

const settings = new Collection('group_download_settings', {});
const rate = new Map(); // userId -> { count, timestamp }
const HOURLY_LIMIT = 25;

const PLATFORMS = {
  youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/i,
  facebook: /^(https?:\/\/)?((?:www|m|web)\.)?(facebook|fb)\.(com|watch)\/.*$/i,
  instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9\-_]+)/i,
  tiktok: /^(https?:\/\/)?((?:www|m|vm|vt)\.)?tiktok\.com\/.*$/i,
  twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/i,
};

function isAutolinkOn(chatId) {
  return !!settings.get(chatId, false);
}
function setAutolink(chatId, on) {
  settings.set(chatId, !!on);
  return !!on;
}

function checkRateLimit(userId) {
  const id = numFromJid(userId) || String(userId);
  const now = Date.now();
  const cur = rate.get(id) || { count: 0, timestamp: now };
  if (now - cur.timestamp > 3600000) {
    rate.set(id, { count: 1, timestamp: now });
    return true;
  }
  if (cur.count >= HOURLY_LIMIT) return false;
  cur.count++;
  rate.set(id, cur);
  return true;
}

function extractValidUrls(text) {
  const urls = [];
  const source = String(text || '');
  for (const [platform, regex] of Object.entries(PLATFORMS)) {
    const re = new RegExp(regex.source, 'gi');
    let m;
    while ((m = re.exec(source)) !== null) {
      urls.push({ url: m[0], platform });
    }
  }
  return urls;
}

async function getVideoData(url) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  try {
    const { data: response } = await axios.get('https://dev-priyanshi.onrender.com/api/alldl', {
      params: { url },
      timeout: 45000,
      headers,
    });
    if (!response?.status || !response?.data) throw new Error('Invalid api response');
    const data = response.data;
    const downloadUrl = data.high || data.low;
    if (!downloadUrl) throw new Error('No download URL found');
    return {
      title: data.title || 'Video',
      thumbnail: data.thumbnail,
      downloadUrl,
      quality: data.high ? 'High' : 'Low',
    };
  } catch (error) {
    try {
      const { data: backup } = await axios.get('https://apis.prexzyvilla.site/download/aio', {
        params: { url },
        timeout: 45000,
        headers,
      });
      const data = backup?.result || backup?.data || backup;
      const downloadUrl = data?.high || data?.low || data?.url || data?.download || data?.video;
      if (!downloadUrl) throw new Error('No download URL found');
      return {
        title: data?.title || 'Video',
        thumbnail: data?.thumbnail || '',
        downloadUrl,
        quality: data?.high ? 'High' : 'Auto',
      };
    } catch (backupError) {
      throw new Error(`Failed to get video data: ${backupError.message || error.message}`);
    }
  }
}

async function downloadToFile(downloadUrl, ext = 'mp4') {
  const out = path.join(os.tmpdir(), `socdl_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
  const { data } = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 80 * 1024 * 1024,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const buf = Buffer.from(data);
  if (!buf.length) throw new Error('Empty download');
  fs.writeFileSync(out, buf);
  return { path: out, buffer: buf, bytes: buf.length };
}

async function downloadSocialVideo(url) {
  const videoData = await getVideoData(url);
  const file = await downloadToFile(videoData.downloadUrl, 'mp4');
  return { ...videoData, ...file };
}

module.exports = {
  PLATFORMS,
  isAutolinkOn,
  setAutolink,
  checkRateLimit,
  extractValidUrls,
  getVideoData,
  downloadToFile,
  downloadSocialVideo,
};
