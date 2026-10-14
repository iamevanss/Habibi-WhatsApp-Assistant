// bbcNews.js — lightweight BBC News scraper used by the WhatsApp news tool.
const axios = require('axios');
function decode(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'");
}
function absolute(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://www.bbc.com' + url;
  return 'https://www.bbc.com/' + url;
}
async function scrapeNews(limit = 5) {
  const { data } = await axios.get('https://www.bbc.com/news', {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HabibiNews/1.0)', Accept: 'text/html,application/xhtml+xml' },
  });
  const html = String(data || '');
  const articles = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"']*(?:\/news\/|\/newsarticles\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && articles.length < Math.max(limit * 3, 12)) {
    const link = absolute(decode(m[1]));
    const inner = m[2];
    const titleMatch = inner.match(/<(?:h[1-6]|span|p)\b[^>]*>([\s\S]*?)<\/(?:h[1-6]|span|p)>/i);
    const title = decode((titleMatch ? titleMatch[1] : inner).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!link || !title || title.length < 8 || seen.has(link)) continue;
    seen.add(link);
    const nearby = html.slice(Math.max(0, m.index - 1200), Math.min(html.length, m.index + 2500));
    const imgMatch = nearby.match(/<(?:img|source)\b[^>]*(?:src|data-src|srcset)=["']([^"']+)["']/i);
    const image = absolute(imgMatch?.[1]?.split(',')[0]?.trim()?.split(' ')[0] || null);
    articles.push({ title, link, image, description: '' });
  }
  return articles.slice(0, limit);
}
module.exports = { scrapeNews };
