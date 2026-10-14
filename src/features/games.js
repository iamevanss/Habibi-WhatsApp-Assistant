'use strict';
// Lightweight game utilities used by command handlers.
const active = new Map();
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function startGuess({ userId, min = 1, max = 100 } = {}) {
  if (!userId) throw new Error('userId is required.');
  min = Math.floor(Number(min)); max = Math.floor(Number(max));
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) throw new Error('Invalid range.');
  const game = { userId: String(userId), min, max, answer: Math.floor(Math.random() * (max - min + 1)) + min, attempts: 0, startedAt: Date.now() };
  active.set(game.userId, game);
  return { min, max, message: `Guess a number from ${min} to ${max}.` };
}
function guess(userId, value) {
  const game = active.get(String(userId));
  if (!game) return { ok: false, error: 'No active guessing game.' };
  const n = Number(value);
  if (!Number.isInteger(n) || n < game.min || n > game.max) return { ok: false, error: `Enter a whole number from ${game.min} to ${game.max}.` };
  game.attempts++;
  if (n === game.answer) { active.delete(game.userId); return { ok: true, won: true, answer: game.answer, attempts: game.attempts }; }
  return { ok: true, won: false, hint: n < game.answer ? 'higher' : 'lower', attempts: game.attempts };
}
function stop(userId) { return active.delete(String(userId)); }
function randomChoice(items) { return Array.isArray(items) && items.length ? pick(items) : null; }
module.exports = { startGuess, guess, stop, randomChoice };
