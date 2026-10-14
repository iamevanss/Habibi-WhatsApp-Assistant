// features/achievements.js — persistent milestone badges. A small catalog + a generic
// unlock(userId, key) call that other features fire when something noteworthy happens.
// Deliberately simple (no complex trigger DSL) — each feature module just calls unlock()
// at the moment its own condition becomes true.
const { Collection } = require('../db');

const store = new Collection('achievements', {}); // userId -> [achievementId]

const CATALOG = {
  first_pack: { name: 'Card Collector', emoji: '🃏', desc: 'Opened your first card pack.' },
  first_win: { name: 'First Blood', emoji: '⚔️', desc: 'Won your first card battle.' },
  battle_streak_5: { name: 'On a Roll', emoji: '🔥', desc: 'Won 5 card battles.' },
  level_10: { name: 'Regular', emoji: '⭐', desc: 'Reached level 10.' },
  level_25: { name: 'Veteran', emoji: '🌟', desc: 'Reached level 25.' },
  rich_5000: { name: 'High Roller', emoji: '💰', desc: `Held a wallet balance of 5,000+.` },
  banker: { name: 'Banker', emoji: '🏦', desc: 'Made your first bank deposit.' },
  married: { name: 'Tied the Knot', emoji: '💍', desc: 'Got married.' },
  legendary_pull: { name: 'Legendary!', emoji: '👑', desc: 'Pulled a legendary card from a pack.' },
  wordgrid_win: { name: 'Wordsmith', emoji: '🟩', desc: 'Solved a wordgrid puzzle.' },
};

function has(userId, key) {
  return store.get(userId, []).includes(key);
}
function unlock(userId, key) {
  if (!CATALOG[key] || has(userId, key)) return null;
  const owned = store.get(userId, []);
  owned.push(key);
  store.set(userId, owned);
  return { ...CATALOG[key], key };
}
function list(userId) {
  const owned = store.get(userId, []);
  return owned.map((key) => ({ ...CATALOG[key], key }));
}
function allDefinitions() {
  return Object.entries(CATALOG).map(([key, def]) => ({ ...def, key }));
}
module.exports = { unlock, has, list, allDefinitions };
