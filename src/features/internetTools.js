// Lightweight internet helpers using configured public endpoints.
const axios = require('axios');
const { URL } = require('url');

function assertHttpUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error('Invalid URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) URLs are supported');
  if (url.username || url.password) throw new Error('URLs with embedded credentials are not supported');
  return url;
}
async function fetchText(value, options = {}) {
  const url = assertHttpUrl(value);
  const timeout = Math.max(1000, Math.min(20000, Number(options.timeout) || 10000));
  const response = await axios.get(url.href, {
    timeout, responseType: 'text', maxContentLength: 1024 * 1024,
    headers: { 'User-Agent': 'HabibiAssistant/1.0', Accept: 'text/plain,text/html,application/json;q=0.9,*/*;q=0.5' },
    validateStatus: status => status >= 200 && status < 400,
  });
  return { url: response.request?.res?.responseUrl || url.href, status: response.status, contentType: response.headers['content-type'] || '', text: String(response.data || '').slice(0, 100000) };
}
async function getJson(value, options = {}) {
  const result = await fetchText(value, options);
  try { return { ...result, data: JSON.parse(result.text) }; }
  catch { throw new Error('The URL did not return valid JSON'); }
}
module.exports = { assertHttpUrl, fetchText, getJson };
