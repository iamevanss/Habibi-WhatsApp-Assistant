// OSINT helpers: normalise public identifiers and build safe search URLs.
// This module does not scrape private accounts or bypass access controls.
const URLS = {
  web: 'https://www.google.com/search?q=',
  images: 'https://www.google.com/search?tbm=isch&q=',
  news: 'https://news.google.com/search?q=',
  github: 'https://github.com/search?q=',
  reddit: 'https://www.reddit.com/search/?q=',
  youtube: 'https://www.youtube.com/results?search_query=',
  linkedin: 'https://www.linkedin.com/search/results/all/?keywords='
};
function cleanQuery(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}
function searchUrl(provider, query) {
  const base = URLS[String(provider || '').toLowerCase()];
  if (!base) throw new Error('Unsupported search provider');
  const q = cleanQuery(query);
  if (!q) throw new Error('Search query is empty');
  return base + encodeURIComponent(q);
}
function usernameCandidates(username) {
  const name = String(username || '').trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!name) return [];
  return [
    { platform: 'GitHub', url: `https://github.com/${encodeURIComponent(name)}` },
    { platform: 'Reddit', url: `https://www.reddit.com/user/${encodeURIComponent(name)}` },
    { platform: 'TikTok', url: `https://www.tiktok.com/@${encodeURIComponent(name)}` },
    { platform: 'Instagram', url: `https://www.instagram.com/${encodeURIComponent(name)}/` },
    { platform: 'X', url: `https://x.com/${encodeURIComponent(name)}` }
  ];
}
module.exports = { URLS, cleanQuery, searchUrl, usernameCandidates };
