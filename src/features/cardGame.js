const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })));
}

function shuffle(deck = createDeck()) {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function deal(deck, count = 1) {
  if (!Array.isArray(deck)) throw new TypeError('deck must be an array');
  const safeCount = Math.max(0, Math.min(deck.length, Math.floor(Number(count) || 0)));
  return { hand: deck.slice(0, safeCount), remaining: deck.slice(safeCount) };
}

module.exports = { createDeck, shuffle, deal };
