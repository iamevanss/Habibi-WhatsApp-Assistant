// features/shop.js — a small cosmetic shop: spend virtual currency on titles that show next
// to your name. No pay-to-win mechanics, no real money — just a currency sink and a bit of
// flair, same spirit as the economy/card game features.
const { Collection } = require('../db');
const economy = require('./economy');

const inventories = new Collection('shop_inventory', {}); // userId -> [itemId]
const equipped = new Collection('shop_equipped', {}); // userId -> itemId

const CATALOG = [
  { id: 'title_vip', name: 'VIP', emoji: '💎', price: 500, desc: 'A shiny VIP tag next to your name.' },
  { id: 'title_legend', name: 'Legend', emoji: '🏆', price: 1200, desc: 'For the chat legends.' },
  { id: 'title_ghost', name: 'Ghost', emoji: '👻', price: 300, desc: 'Spooky and mysterious.' },
  { id: 'title_og', name: 'OG', emoji: '🕶️', price: 800, desc: 'Been here since day one.' },
  { id: 'title_royalty', name: 'Royalty', emoji: '👑', price: 2000, desc: 'The most expensive flex in the shop.' },
];

function catalog() { return CATALOG; }
function itemById(id) { return CATALOG.find((i) => i.id === id) || null; }
function inventory(userId) { return inventories.get(userId, []); }

function buy(userId, itemId) {
  const item = itemById(itemId);
  if (!item) return { ok: false, error: `No item "${itemId}" in the shop. Check the catalog.` };
  const owned = inventory(userId);
  if (owned.includes(itemId)) return { ok: false, error: `You already own "${item.name}".` };
  const bal = economy.getBalance(userId);
  if (bal < item.price) return { ok: false, error: `Not enough ${economy.CUR} — "${item.name}" costs ${item.price}, you have ${bal}.` };
  economy.addBalance(userId, -item.price);
  inventories.set(userId, [...owned, itemId]);
  return { ok: true, item, balance: economy.getBalance(userId) };
}

function equip(userId, itemId) {
  const owned = inventory(userId);
  if (!owned.includes(itemId)) return { ok: false, error: "You don't own that item yet — buy it first." };
  equipped.set(userId, itemId);
  return { ok: true, item: itemById(itemId) };
}
function getEquipped(userId) { const id = equipped.get(userId, null); return id ? itemById(id) : null; }

module.exports = { catalog, itemById, inventory, buy, equip, getEquipped };
