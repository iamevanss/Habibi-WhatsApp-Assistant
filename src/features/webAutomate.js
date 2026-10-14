// Browser automation entry point. Playwright is optional and must be installed separately.
async function openPage(url, options = {}) {
  let parsed;
  try { parsed = new URL(String(url)); } catch { throw new Error('A valid URL is required'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP(S) pages can be opened');
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { throw new Error('Playwright is not installed. Install it and its Chromium browser to enable automation.'); }
  const browser = await chromium.launch({ headless: options.headless !== false, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(parsed.href, { waitUntil: options.waitUntil || 'domcontentloaded', timeout: Math.min(60000, Number(options.timeout) || 20000) });
    const result = {
      url: page.url(),
      title: await page.title(),
      text: (await page.locator('body').innerText().catch(() => '')).slice(0, 20000)
    };
    if (options.screenshot) result.screenshot = await page.screenshot({ type: 'png', fullPage: false });
    return result;
  } finally { await browser.close(); }
}
module.exports = { openPage };
