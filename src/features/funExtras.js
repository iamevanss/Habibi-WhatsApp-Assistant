// features/funExtras.js — lightweight extra commands (facts, quotes, translate, vibe)
const axios = require('axios');
const { Collection } = require('../db');
const economy = require('./economy');
const { numFromJid } = require('../utils/helpers');
const vibes = new Collection('user_vibes', {});
const QUOTES = ['The only way to do great work is to love what you do. — Steve Jobs', 'It always seems impossible until it is done. — Nelson Mandela', 'Simplicity is the ultimate sophistication. — Leonardo da Vinci', 'Stay hungry, stay foolish. — Steve Jobs', 'Be yourself; everyone else is already taken. — Oscar Wilde', 'In the middle of difficulty lies opportunity. — Einstein'];
const FACTS = ['Honey never spoils — edible honey was found in ancient Egyptian tombs.', 'Octopuses have three hearts.', 'Bananas are berries; strawberries are not.', 'A day on Venus is longer than a year on Venus.', "Your brain uses about 20% of your body's energy.", 'Sharks existed before trees.'];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function quote() { return `💬 ${pick(QUOTES)}`; }
function fact() { return `🧠 ${pick(FACTS)}`; }
async function translate(text, to = 'en') {
  const q = String(text || '').trim(); if (!q) return { ok: false, error: 'What should I translate?' };
  const LANG = { english: 'en', en: 'en', french: 'fr', fr: 'fr', spanish: 'es', es: 'es', portuguese: 'pt', pt: 'pt', arabic: 'ar', ar: 'ar', hausa: 'ha', ha: 'ha', yoruba: 'yo', yo: 'yo', igbo: 'ig', ig: 'ig', german: 'de', de: 'de', italian: 'it', it: 'it', chinese: 'zh', zh: 'zh', hindi: 'hi', hi: 'hi', pidgin: 'en' };
  const target = LANG[String(to || 'en').toLowerCase().trim()] || String(to || 'en').toLowerCase().slice(0, 8);
  try { const { data } = await axios.get('https://api.mymemory.translated.net/get', { params: { q: q.slice(0, 500), langpair: `autodetect|${target}` }, timeout: 20000 }); const out = data?.responseData?.translatedText; if (out) return { ok: true, text: out, to: target, source: 'mymemory' }; } catch {}
  try { const { data } = await axios.post('https://libretranslate.com/translate', { q: q.slice(0, 1000), source: 'auto', target, format: 'text' }, { timeout: 20000, headers: { 'Content-Type': 'application/json' } }); if (data?.translatedText) return { ok: true, text: data.translatedText, to: target, source: 'libre' }; } catch {}
  return { ok: false, error: 'Translation services timed out. Try again in a moment.' };
}
function setVibe(userJid, vibe) { const v = String(vibe || '').trim().slice(0, 80); vibes.set(numFromJid(userJid), { vibe: v, at: Date.now() }); return v; }
function getVibe(userJid) { return vibes.get(numFromJid(userJid), null); }
function flip() { return Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails'; }
function roll(sides = 6) { const n = Math.max(2, Math.min(100, Number(sides) || 6)); return `🎲 ${1 + Math.floor(Math.random() * n)} (d${n})`; }
function shipPercent(a, b) { const s = String(numFromJid(a)) + String(numFromJid(b)); let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 101; }
async function weather(city) {
  const q = String(city || '').trim(); if (!q) return { ok: false, error: 'Which city?' };
  try { const { data } = await axios.get('https://wttr.in/' + encodeURIComponent(q), { params: { format: 'j1' }, timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }); const cur = data?.current_condition?.[0], area = data?.nearest_area?.[0]?.areaName?.[0]?.value || q; if (!cur) throw new Error('no data'); return { ok: true, text: `🌤️ *${area}*\n${cur.weatherDesc?.[0]?.value || ''} · ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)\nHumidity ${cur.humidity}% · Wind ${cur.windspeedKmph} km/h` }; } catch (e) { return { ok: false, error: e.message }; }
}
function tipJar(userJid, amount = 10) { const a = Math.max(1, Math.min(500, Number(amount) || 10)), bal = economy.getBalance(numFromJid(userJid)); if (bal < a) return { ok: false, error: `Not enough coins (have ${bal}).` }; economy.addBalance(numFromJid(userJid), -a); return { ok: true, text: `🙏 Tipped ${a} coins into the void. New balance: ${economy.getBalance(numFromJid(userJid))}.` }; }
module.exports = { quote, fact, translate, setVibe, getVibe, flip, roll, shipPercent, weather, tipJar };
