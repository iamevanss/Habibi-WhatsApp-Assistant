'use strict';
const https = require('https');
const http = require('http');
function getPage(urlString, options = {}) { return new Promise((resolve, reject) => { let url; try { url = new URL(urlString); } catch { return reject(new Error('Invalid URL')); } if (!['http:', 'https:'].includes(url.protocol)) return reject(new Error('Only HTTP(S) is allowed')); const client = url.protocol === 'https:' ? https : http; const req = client.get(url, { headers: { 'user-agent': 'HabibiBrowser/1.0' }, timeout: Math.min(15000, Number(options.timeout) || 10000) }, res => { let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; if (body.length > 750000) req.destroy(new Error('Page exceeds size limit')); }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, url: url.href })); }); req.on('timeout', () => req.destroy(new Error('Page request timed out'))); req.on('error', reject); }); }
function extractTitle(html) { const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i); return match ? match[1].replace(/\s+/g, ' ').trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"') : ''; }
module.exports = { getPage, extractTitle };
