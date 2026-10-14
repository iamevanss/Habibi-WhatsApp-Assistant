const conversations = new Map();

function getMemory(key) {
  const value = conversations.get(String(key));
  return value ? [...value] : [];
}

function addMemory(key, entry, limit = 30) {
  const id = String(key);
  const items = conversations.get(id) || [];
  items.push({ ...entry, timestamp: entry?.timestamp || Date.now() });
  const max = Math.max(1, Number(limit) || 30);
  conversations.set(id, items.slice(-max));
  return getMemory(id);
}

function clearMemory(key) {
  return conversations.delete(String(key));
}

function clearAllMemory() {
  conversations.clear();
}

module.exports = { getMemory, addMemory, clearMemory, clearAllMemory };
