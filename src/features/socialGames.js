const sessions = new Map();

function startGame(chatId, type, players = []) {
  if (!chatId || !type) throw new TypeError('chatId and type are required');
  const session = {
    type: String(type),
    players: [...new Set(players.map(String))],
    startedAt: Date.now(),
    state: 'active'
  };
  sessions.set(String(chatId), session);
  return { ...session, players: [...session.players] };
}

function joinGame(chatId, playerId) {
  const session = sessions.get(String(chatId));
  if (!session || session.state !== 'active') return null;
  const id = String(playerId);
  if (!session.players.includes(id)) session.players.push(id);
  return { ...session, players: [...session.players] };
}

function endGame(chatId) {
  const key = String(chatId);
  const session = sessions.get(key);
  if (!session) return false;
  session.state = 'ended';
  sessions.delete(key);
  return true;
}

function getGame(chatId) {
  const session = sessions.get(String(chatId));
  return session ? { ...session, players: [...session.players] } : null;
}

module.exports = { startGame, joinGame, endGame, getGame };
