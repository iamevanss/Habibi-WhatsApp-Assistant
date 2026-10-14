// Local preview server helpers for generated websites.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function safePath(root, requestPath) {
  const decoded = decodeURIComponent(String(requestPath || '/').split('?')[0]);
  const candidate = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
  const base = path.resolve(root);
  if (candidate !== base && !candidate.startsWith(base + path.sep)) return null;
  return candidate;
}

function createPreviewServer(root, options = {}) {
  const dir = path.resolve(root);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('Preview root must be an existing directory');
  }
  const server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end('Method not allowed');
    }
    const file = safePath(dir, req.url);
    if (!file) { res.writeHead(403); return res.end('Forbidden'); }
    let target = file;
    try {
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        res.writeHead(404); return res.end('Not found');
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache'
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(target).pipe(res);
    } catch {
      res.writeHead(500); res.end('Preview error');
    }
  });
  const host = options.host || '127.0.0.1';
  const port = Number(options.port || 0);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({ server, host, port: address.port, url: `http://${host}:${address.port}`, close: () => new Promise((r, j) => server.close(e => e ? j(e) : r())) });
    });
  });
}

module.exports = { createPreviewServer, safePath, MIME };
