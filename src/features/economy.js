'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.resolve(process.cwd(), 'data/economy_wallets.json');
function read() { try { const value = JSON.parse(fs.readFileSync(FILE, 'utf8')); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
function write(data) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, FILE); }
function balance(id) { return Number(read()[id] || 0); }
function add(id, amount) { amount = Math.floor(Number(amount)); if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a non-negative number'); const data = read(); data[id] = Math.max(0, Number(data[id] || 0)) + amount; write(data); return data[id]; }
function transfer(from, to, amount) { amount = Math.floor(Number(amount)); if (!from || !to || from === to || !Number.isFinite(amount) || amount <= 0) throw new Error('Invalid transfer'); const data = read(); if (Number(data[from] || 0) < amount) throw new Error('Insufficient balance'); data[from] = Number(data[from]) - amount; data[to] = Number(data[to] || 0) + amount; write(data); return { from: data[from], to: data[to] }; }
module.exports = { balance, add, transfer };
