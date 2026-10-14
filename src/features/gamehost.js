const rooms = new Map();

function createRoom(id, game, host) {
  if (!id || !game || !host) throw new TypeError('id, game and host are required');
  const room = { id: String(id), game: String(game), host: String(host), players: [String(host)], createdAt: Date.now() };
  rooms.set(room.id, room);
  return { ...room, players: [...room.players] };
}

function joinRoom(id, player) {
  const room = rooms.get(String(id));
  if (!room) return null;
  const playerId = String(player);
  if (!room.players.includes(playerId)) room.players.push(playerId);
  return { ...room, players: [...room.players] };
}

function closeRoom(id, requester) {
  const key = String(id);
  const room = rooms.get(key);
  if (!room || (requester && room.host !== String(requester))) return false;
  return rooms.delete(key);
}

function listRooms() {
  return [...rooms.values()].map(room => ({ ...room, players: [...room.players] }));
}

module.exports = { createRoom, joinRoom, closeRoom, listRooms };
