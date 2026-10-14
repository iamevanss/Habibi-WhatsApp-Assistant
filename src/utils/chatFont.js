// Persistent per-chat WhatsApp text styling. Unicode styles are used because plain
// WhatsApp text cannot embed arbitrary TTF/OTF font files.
const { Collection } = require('../db');
const textStyler = require('./textStyler');
const store = new Collection('chat_fonts', {});

function get(chatId) { return store.get(chatId, null); }
function set(chatId, style, preset = '', symbols = '', symbolPosition = 'both') {
  const cfg = { style: style || 'normal', preset: preset || '', symbols: symbols || '', symbolPosition: symbolPosition || 'both' };
  store.set(chatId, cfg); return cfg;
}
function reset(chatId) { store.delete(chatId); }
function apply(chatId, text) {
  const cfg = get(chatId); if (!cfg || (cfg.style === 'normal' && !cfg.preset && !cfg.symbols)) return String(text ?? '');
  let out = cfg.preset
    ? textStyler.designText(String(text ?? ''), cfg.preset, { style: cfg.style !== 'normal' ? cfg.style : undefined })
    : textStyler.styleText(String(text ?? ''), cfg.style || 'normal');
  if (cfg.symbols) out = textStyler.addSymbols(out, cfg.symbols, cfg.symbolPosition || 'both');
  return out;
}
function describe(chatId) { return get(chatId); }
module.exports = { get, set, reset, apply, describe };
