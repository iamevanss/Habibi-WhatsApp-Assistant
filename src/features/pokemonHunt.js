// Lightweight Pokémon hunt state: one encounter per chat, with safe random selection.
const { Collection } = require('../db');
const store = new Collection('pokemon_hunt', {});
const SPECIES = [
  { name: 'Bulbasaur', type: 'Grass/Poison', rarity: 1 },
  { name: 'Charmander', type: 'Fire', rarity: 1 },
  { name: 'Squirtle', type: 'Water', rarity: 1 },
  { name: 'Pikachu', type: 'Electric', rarity: 2 },
  { name: 'Eevee', type: 'Normal', rarity: 2 },
  { name: 'Snorlax', type: 'Normal', rarity: 4 },
  { name: 'Dratini', type: 'Dragon', rarity: 4 },
  { name: 'Mew', type: 'Psychic', rarity: 5 }
];
function encounter(chatId) {
  const chat = String(chatId || '');
  if (!chat) throw new Error('Chat id is required');
  const old = store.get(chat, null);
  if (old && !old.caught && Date.now() - old.createdAt < 10 * 60 * 1000) return old;
  const pool = SPECIES.flatMap(p => Array.from({ length: Math.max(1, 6 - p.rarity) }, () => p));
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const item = { ...picked, caught: false, createdAt: Date.now() };
  store.set(chat, item);
  return item;
}
function catchPokemon(chatId, guess) {
  const chat = String(chatId || '');
  const current = store.get(chat, null);
  if (!current || current.caught || Date.now() - current.createdAt > 10 * 60 * 1000) return { ok: false, message: 'There is no active encounter.' };
  if (String(guess || '').trim().toLowerCase() !== current.name.toLowerCase()) return { ok: false, message: 'That is not the Pokémon in this encounter.' };
  current.caught = true; current.caughtAt = Date.now(); store.set(chat, current);
  return { ok: true, pokemon: current.name, type: current.type };
}
function currentEncounter(chatId) { return store.get(String(chatId || ''), null); }
module.exports = { encounter, catchPokemon, currentEncounter, SPECIES };
