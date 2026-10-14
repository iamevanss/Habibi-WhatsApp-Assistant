'use strict';
const https = require('https');
const http = require('http');
function fetchText(address, timeout = 10000) { return new Promise((resolve, reject) => { let url; try { url = new URL(address); } catch { return reject(new Error('Invalid URL')); } if (!['http:', 'https:'].includes(url.protocol)) return reject(new Error('Only HTTP(S) URLs are allowed')); const client = url.protocol === 'https:' ? https : http; const req = client.get(url, { headers: { 'user-agent': 'HabibiAssistant/1.0' }, timeout }, res => { let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(new Error('Response too large')); }); res.on('end', () => resolve({ status: res.statusCode, url: res.responseUrl || address, body })); }); req.on('timeout', () => req.destroy(new Error('Request timed out'))); req.on('error', reject); }); }
function stripHtml(html) { return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
async function scrapeText(url) { const result = await fetchText(url); return { status: result.status, text: stripHtml(result.body).slice(0, 12000) }; }
module.exports = { fetchText, stripHtml, scrapeText };
