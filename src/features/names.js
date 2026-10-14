// features/names.js — capture and remember each user's WhatsApp display name
// (push name) and per-group nickname, persisted to disk so names survive restarts.
//
// WhatsApp has no "username" system like Discord — the closest things are the
// profile/push name (set in WhatsApp settings, visible in DMs) and the group
// participant nickname (set via "@name" inside a group). We track both and let
// the bot address users by whichever is known.
const { Collection } = require('../db');
const { numFromJid } = require('../utils/helpers');

const store = new Collection('user_names', {});

function _num(jidOrNum) { return numFromJid(jidOrNum); }

function rememberPush(jidOrNum, pushName) {
  const n = _num(jidOrNum);
  const name = (pushName || '').trim();
  if (!name) return;
  const cur = store.get(n, {}) || {};
  if (cur.pushName !== name) {
    cur.pushName = name;
    store.set(n, cur);
  }
  return cur;
}

function rememberGroupNick(jidOrNum, groupId, nick) {
  const n = _num(jidOrNum);
  const g = _num(groupId);
  const nickClean = (nick || '').trim();
  const cur = store.get(n, {}) || {};
  if (!cur.groups) cur.groups = {};
  if (nickClean) cur.groups[g] = nickClean;
  store.set(n, cur);
  return cur;
}

function getName(jidOrNum, groupId) {
  const n = _num(jidOrNum);
  const cur = store.get(n, null);
  if (!cur) return '';
  if (groupId) {
    const g = _num(groupId);
    if (cur.groups && cur.groups[g]) return cur.groups[g];
  }
  return cur.pushName || '';
}

function mentionLabel(jidOrNum, groupId, groupMeta) {
  const name = getName(jidOrNum, groupId);
  if (name) return name;
  const raw = String(jidOrNum || '');
  if (groupMeta?.participants) {
    const hit = groupMeta.participants.find((p) =>
      [p.id, p.lid, p.jid, p.phoneNumber].filter(Boolean).map(String).includes(raw)
    );
    if (hit) {
      const pn = hit.phoneNumber || hit.jid || (String(hit.id || '').endsWith('@s.whatsapp.net') ? hit.id : null);
      if (pn) return String(pn).replace(/\D/g, '') || _num(pn);
    }
  }
  if (raw.endsWith('@lid')) return name || 'member';
  return _num(jidOrNum) || raw;
}

function displayLabel(jidOrNum, groupId, groupMeta) {
  const raw = String(jidOrNum || '');
  const isLid = raw.includes('@lid');
  const name = getName(jidOrNum, groupId);
  let number = _num(jidOrNum);

  if (isLid && groupMeta?.participants) {
    const match = groupMeta.participants.find((p) => p.id === raw || p.lid === raw || p.jid === raw || p.phoneNumber === raw);
    if (match) {
      if (match.phoneNumber) number = _num(match.phoneNumber);
      else if (match.jid && !String(match.jid).includes('@lid')) number = _num(match.jid);
      else if (match.phoneNumberAlt) number = _num(match.phoneNumberAlt);
    }
  }
  return name ? `${name} (${number})` : number;
}

function all() { return store.all(); }

function mentionJid(jidOrNum, groupMeta) {
  const raw = String(jidOrNum || '');
  if (!raw) return null;
  const jidResolver = require('../utils/jidResolver');
  if (jidResolver.isPn(raw)) return raw;
  if (/^\d{8,15}$/.test(raw)) return `${raw}@s.whatsapp.net`;
  if (raw.endsWith('@lid') || jidResolver.isLid(raw)) {
    const rec = (groupMeta?.participants || []).find((p) => {
      const ids = [p.id, p.lid, p.jid, p.phoneNumber, p.participantPn, p.participantAlt].filter(Boolean).map(String);
      return ids.includes(raw);
    });
    const pn = rec?.phoneNumber || rec?.jid || rec?.participantPn || (rec?.id && String(rec.id).endsWith('@s.whatsapp.net') ? rec.id : null);
    if (pn) {
      const s = String(pn);
      return s.includes('@') ? s : `${s.replace(/\D/g, '')}@s.whatsapp.net`;
    }
    const alias = jidResolver.aliases?.()?.get?.(raw) || jidResolver.resolve?.(raw, new Map());
    if (alias && jidResolver.isPn(alias)) return alias;
  }
  const n = _num(raw);
  if (n && n.length >= 8 && n.length <= 15) return `${n}@s.whatsapp.net`;
  return null;
}

function normalizeMentions(list, groupMeta) {
  const out = [];
  for (const j of list || []) {
    const m = mentionJid(j, groupMeta);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

module.exports = { mentionJid, normalizeMentions, rememberPush, rememberGroupNick, getName, mentionLabel, displayLabel, all };
