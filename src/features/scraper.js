// features/scraper.js — lightweight web scraping utilities
const axios = require('axios');
const logger = require('../logger');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
async function scrapeUrl(url, options = {}) {
  const { maxItems = 10, timeout = 10000 } = options;
  try {
    const resp = await axios.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' }, timeout, responseType: 'text' });
    const html = resp.data || '';
    const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, maxItems);
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]).filter(l => l.startsWith('http')).slice(0, maxItems);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    return { url, title: ogTitle || (titles[0] || '').slice(0, 200), description: (descMatch?.[1] || '').slice(0, 300), image: ogImage, links: links.slice(0, maxItems), status: resp.status };
  } catch (e) { logger.warn({ err: e.message, url }, 'scrapeUrl failed'); return { url, error: e.message, title: null, description: null }; }
}
async function batchScrape(urls, options = {}) {
  const results = [];
  for (const url of urls.slice(0, 5)) results.push(await scrapeUrl(url, options));
  return results;
}
async function webSearch(query, count = 5) {
  try {
    const resp = await axios.get(`https://ddg-api.herokuapp.com/search?query=${encodeURIComponent(query)}&limit=${count}`, { headers: { 'User-Agent': UA }, timeout: 8000 });
    return resp.data?.results?.map(r => ({ title: r.title, url: r.url, snippet: (r.snippet || '').slice(0, 200) })) || [];
  } catch (e) { return [{ error: e.message }]; }
}
module.exports = { scrapeUrl, batchScrape, webSearch };
