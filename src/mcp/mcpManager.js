'use strict';
const fs = require('fs');
const path = require('path');
const CONFIG = path.resolve(process.cwd(), 'mcp.servers.json');
function loadServers() { try { const data = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); return Array.isArray(data) ? data : (data.servers || []); } catch { return []; } }
function listServers() { return loadServers().map(s => ({ name: s.name || s.id || 'unnamed', command: s.command || null, enabled: s.enabled !== false })); }
function getServer(name) { return loadServers().find(s => s.name === name || s.id === name) || null; }
module.exports = { loadServers, listServers, getServer };
