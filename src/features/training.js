// User-managed prompt examples. This stores examples only; it does not train model weights.
const { Collection } = require('../db');
const store = new Collection('training_examples', {});
const MAX_EXAMPLES = 500;

function add(input, output, addedBy = 'unknown') {
  const prompt = String(input || '').trim();
  const answer = String(output || '').trim();
  if (!prompt || !answer) throw new Error('Both input and output are required');
  if (prompt.length > 4000 || answer.length > 6000) throw new Error('Example is too long');
  const all = store.get('items', []);
  const item = { id: `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, input: prompt, output: answer, addedBy: String(addedBy), createdAt: Date.now() };
  all.push(item);
  store.set('items', all.slice(-MAX_EXAMPLES));
  return item;
}
function remove(id) {
  const all = store.get('items', []);
  const next = all.filter(x => x.id !== id);
  store.set('items', next);
  return next.length !== all.length;
}
function list(limit = 50) { return store.get('items', []).slice(-Math.max(1, Math.min(200, Number(limit) || 50))).reverse(); }
function find(input) {
  const needle = String(input || '').toLowerCase().trim();
  if (!needle) return null;
  return store.get('items', []).slice().reverse().find(x => x.input.toLowerCase() === needle) || null;
}
function clear() { store.set('items', []); }
module.exports = { add, remove, list, find, clear };
