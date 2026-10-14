'use strict';
function formatDuration(seconds) { let n = Math.max(0, Math.floor(Number(seconds) || 0)); const days = Math.floor(n / 86400); n %= 86400; const hours = Math.floor(n / 3600); n %= 3600; const minutes = Math.floor(n / 60); const secs = n % 60; return [days && days + 'd', hours && hours + 'h', minutes && minutes + 'm', secs + 's'].filter(Boolean).join(' ') || '0s'; }
function randomChoice(items) { if (!Array.isArray(items) || !items.length) throw new Error('Provide a non-empty list'); return items[Math.floor(Math.random() * items.length)]; }
function chunkText(text, size = 3500) { size = Math.max(1, Math.floor(Number(size) || 3500)); const s = String(text ?? ''); const chunks = []; for (let i = 0; i < s.length; i += size) chunks.push(s.slice(i, i + size)); return chunks; }
module.exports = { formatDuration, randomChoice, chunkText };
