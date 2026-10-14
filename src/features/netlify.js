'use strict';
// Netlify deployment request builder; requires a separately configured deploy token.
function validateConfig({ siteId, token } = {}) {
  const missing = [];
  if (!siteId) missing.push('siteId');
  if (!token) missing.push('token');
  return { ok: missing.length === 0, missing };
}
async function deploy({ siteId, token, zipBuffer, fetchImpl = globalThis.fetch } = {}) {
  const check = validateConfig({ siteId, token });
  if (!check.ok) return { ok: false, error: `Missing Netlify configuration: ${check.missing.join(', ')}` };
  if (!zipBuffer) return { ok: false, error: 'A deployment ZIP buffer is required.' };
  if (typeof fetchImpl !== 'function') return { ok: false, error: 'Fetch API is unavailable.' };
  const response = await fetchImpl(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
    body: zipBuffer,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: body.message || 'Netlify deployment failed.' };
  return { ok: true, id: body.id || null, state: body.state || 'created', url: body.deploy_url || body.ssl_url || null };
}
module.exports = { validateConfig, deploy };
