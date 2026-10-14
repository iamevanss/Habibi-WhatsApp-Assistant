// features/partyExtras.js — couple dates, tournaments, quiz seasons, multi-lang prefs
const { Collection } = require('../db');
const economy = require('./economy');
const { numFromJid } = require('../utils/helpers');
const dates = new Collection('couple_dates', {}), tournaments = new Collection('tournaments', {}), seasons = new Collection('quiz_seasons', {}), langPrefs = new Collection('user_lang', {});
const DATE_IDEAS = ['Cook a meal together on video call', 'Pick a movie and watch “together” (same start time)', '30-minute walk + voice notes of what you see', 'Share 3 childhood photos and stories', 'Play couple quiz in this group', 'Write each other a short letter in chat'];
function dateNight(userA, userB) {
  const idea = DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)], a = numFromJid(userA), b = numFromJid(userB), key = [a, b].sort().join(':');
  dates.set(key, { idea, at: Date.now(), a, b }); economy.addBalance(a, 25); economy.addBalance(b, 25);
  return { ok: true, idea, bonus: 25, message: `💘 Date night idea:\n*${idea}*\n\nBoth of you get +25 coins. Have fun.` };
}
function startTournament(chatId, hostJid, game = 'trivia', maxPlayers = 8) {
  tournaments.set(chatId, { game, host: numFromJid(hostJid), players: [numFromJid(hostJid)], maxPlayers, started: Date.now(), status: 'lobby', scores: {} });
  return { ok: true, text: `🏆 Tournament lobby open (${game})\nHost started it. Send *join tournament* to enter (${maxPlayers} max).\nHost: *start tournament* when ready.` };
}
function joinTournament(chatId, userJid) {
  const t = tournaments.get(chatId, null); if (!t || t.status !== 'lobby') return { ok: false, error: 'No open tournament lobby.' };
  const id = numFromJid(userJid); if (t.players.includes(id)) return { ok: true, text: 'You already joined.' };
  if (t.players.length >= t.maxPlayers) return { ok: false, error: 'Lobby full.' };
  t.players.push(id); tournaments.set(chatId, t); return { ok: true, text: `✅ Joined tournament (${t.players.length}/${t.maxPlayers}).` };
}
function beginTournament(chatId, hostJid) {
  const t = tournaments.get(chatId, null); if (!t || t.status !== 'lobby') return { ok: false, error: 'No lobby.' };
  if (numFromJid(hostJid) !== t.host) return { ok: false, error: 'Only the host can start.' };
  if (t.players.length < 2) return { ok: false, error: 'Need at least 2 players.' };
  t.status = 'live'; t.scores = Object.fromEntries(t.players.map(p => [p, 0])); tournaments.set(chatId, t);
  return { ok: true, text: `🏁 Tournament LIVE — ${t.players.length} players.\nPlay normal *${t.game}* rounds; first to 3 correct answers wins (tracked via *tour score*).\nOr just play free-form and host calls *end tournament @winner*.` };
}
function tournamentScore(chatId, userJid, points = 1) {
  const t = tournaments.get(chatId, null); if (!t || t.status !== 'live') return null;
  const id = numFromJid(userJid); if (!Object.prototype.hasOwnProperty.call(t.scores, id)) return null;
  t.scores[id] = (t.scores[id] || 0) + points; tournaments.set(chatId, t);
  if (t.scores[id] >= 3) { economy.addBalance(id, 300); tournaments.delete(chatId); return { won: true, text: '🏆 Tournament over! Winner gets +300 coins.' }; }
  return { won: false, score: t.scores[id], text: `📊 Score: ${t.scores[id]}/3` };
}
function endTournament(chatId, winnerJid) { if (!tournaments.get(chatId, null)) return { ok: false, error: 'No tournament.' }; tournaments.delete(chatId); if (winnerJid) { economy.addBalance(numFromJid(winnerJid), 300); return { ok: true, text: '🏆 Tournament closed. Winner +300 coins.' }; } return { ok: true, text: 'Tournament closed with no winner.' }; }
function seasonState() { return seasons.get('current', { id: 1, name: 'Season 1', points: {}, started: Date.now() }); }
function addSeasonPoints(userJid, pts = 10) { const s = seasonState(), id = numFromJid(userJid); s.points[id] = (s.points[id] || 0) + pts; seasons.set('current', s); return s.points[id]; }
function seasonLeaderboard(limit = 10) { return Object.entries(seasonState().points || {}).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, pts], i) => `${i + 1}. ${id} — ${pts} pts`); }
function newSeason(name) { const cur = seasonState(), next = { id: (cur.id || 1) + 1, name: name || `Season ${(cur.id || 1) + 1}`, points: {}, started: Date.now() }; seasons.set('current', next); return next; }
function setLang(userJid, lang) { const code = String(lang || 'en').toLowerCase().slice(0, 8); langPrefs.set(numFromJid(userJid), code); return code; }
function getLang(userJid) { return langPrefs.get(numFromJid(userJid), 'en'); }
module.exports = { dateNight, startTournament, joinTournament, beginTournament, tournamentScore, endTournament, addSeasonPoints, seasonLeaderboard, newSeason, seasonState, setLang, getLang, DATE_IDEAS };
