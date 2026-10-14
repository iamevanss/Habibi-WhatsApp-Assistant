const routes = new Map();

function register(name, handler) {
  if (typeof name !== 'string' || !name.trim()) throw new TypeError('Route name is required');
  if (typeof handler !== 'function') throw new TypeError('Route handler must be a function');
  routes.set(name.trim().toLowerCase(), handler);
  return () => routes.delete(name.trim().toLowerCase());
}

async function dispatch(name, context) {
  const handler = routes.get(String(name || '').trim().toLowerCase());
  if (!handler) return { handled: false, reason: 'not_found' };
  await handler(context);
  return { handled: true };
}

function listRoutes() {
  return [...routes.keys()];
}

module.exports = { register, dispatch, listRoutes };
