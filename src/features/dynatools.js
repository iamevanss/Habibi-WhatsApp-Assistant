// features/dynatools.js — the bot can create its own tools at runtime.
//
// When the model is asked to do something it has no built-in tool for, it can call
// create_tool with a name, description, JSON params schema, and a JS implementation.
// We:
//   1. Write the implementation to tools/custom/<name>.js (persisted)
//   2. Register it in an in-memory map so subsequent turns can call it via execute_custom_tool
//   3. Return the tool id so the model knows it's ready
//
// This makes the agent effectively self-extending: if no tool exists, it makes one.
const fs = require('fs');
const path = require('path');

const CUSTOM_DIR = path.join(__dirname, '..', '..', 'tools', 'custom');
if (!fs.existsSync(CUSTOM_DIR)) fs.mkdirSync(CUSTOM_DIR, { recursive: true });

// name -> { description, params, fn }
const registry = new Map();

/** Load any previously-created custom tools on boot. */
function loadCustom() {
  if (!fs.existsSync(CUSTOM_DIR)) return;
  for (const f of fs.readdirSync(CUSTOM_DIR)) {
    if (!f.endsWith('.js')) continue;
    try {
      const mod = require(path.join(CUSTOM_DIR, f));
      if (mod && mod.name && typeof mod.fn === 'function') {
        registry.set(mod.name, { description: mod.description || '', params: mod.params || {}, fn: mod.fn });
      }
    } catch (e) {
      console.error('failed to load custom tool', f, e.message);
    }
  }
}

/**
 * Create a new tool from a JS function body.
 * @param {object} spec { name, description, params, impl }
 *   impl: a string of a function body that takes (args, ctx) and returns a value or
 *   Promise<value>. ctx has { sock, chatId, senderJid, isGroup, exec } where exec runs a shell command.
 * @returns {object} { ok, name } or { ok:false, error }
 */
function createTool(spec) {
  const name = String(spec.name || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!name) return { ok: false, error: 'Tool needs a valid name.' };
  const description = String(spec.description || `Custom tool ${name}`);
  const params = (spec.params && typeof spec.params === 'object') ? spec.params : {};
  const impl = String(spec.impl || '');

  // Build the implementation safely: wrap the body in an async function.
  // eslint-disable-next-line no-new-func
  let fn;
  try {
    const factory = new Function('require', 'ctx', 'async', `
      return (async (args, ctx) => {
        ${impl}
      });
    `);
    // We pass a limited require for safety: only allow a few safe modules.
    const safeRequire = (mod) => {
      const allowed = ['fs', 'path', 'os', 'child_process'];
      if (!allowed.includes(mod)) throw new Error('module not allowed: ' + mod);
      return require(mod);
    };
    fn = factory(safeRequire);
    // sanity check it's callable
    if (typeof fn !== 'function') throw new Error('impl did not produce a function');
  } catch (e) {
    return { ok: false, error: 'Bad tool implementation: ' + e.message };
  }

  // persist
  const file = path.join(CUSTOM_DIR, `${name}.js`);
  const modSource = `module.exports = {\n  name: ${JSON.stringify(name)},\n  description: ${JSON.stringify(description)},\n  params: ${JSON.stringify(params)},\n  fn: async (args, ctx) => {\n${impl}\n  },\n};\n`;
  try {
    fs.writeFileSync(file, modSource);
  } catch (e) {
    return { ok: false, error: 'Could not persist tool: ' + e.message };
  }

  registry.set(name, { description, params, fn });
  return { ok: true, name, description };
}

/** Call a custom tool by name. */
async function executeCustom(name, args, ctx) {
  const tool = registry.get(name);
  if (!tool) return { ok: false, error: `No custom tool named ${name}` };
  try {
    const result = await tool.fn(args || {}, ctx);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** List registered custom tools (for the model). */
function listCustom() {
  return Array.from(registry.entries()).map(([name, t]) => ({ name, description: t.description, params: t.params }));
}

// load on require
loadCustom();

/** Remove a custom tool from the registry and delete its file. Returns true if removed. */
function remove(name) {
  if (!name || !registry.has(name)) return false;
  registry.delete(name);
  const file = path.join(CUSTOM_DIR, `${name}.js`);
  if (fs.existsSync(file)) {
    try { fs.unlinkSync(file); } catch {}
  }
  return true;
}

module.exports = { createTool, executeCustom, listCustom, remove, registry, CUSTOM_DIR };
