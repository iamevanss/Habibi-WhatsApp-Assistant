// jidResolver.js — keeps WhatsApp LID/phone-number identities consistent.
// WhatsApp can now deliver mentions/participants as @lid. Never treat the numeric LID
// itself as a phone number. Prefer participantAlt/participantPn/groupMetadata mappings.
const { numFromJid } = require('./helpers');

function isLid(jid) { return String(jid || '').endsWith('@lid'); }
function isPn(jid) { return String(jid || '').endsWith('@s.whatsapp.net'); }

const knownAliases = new Map();

function rememberPair(a, b) {
  if (!a || !b) return;
  const aa = String(a);
  const bb = String(b);
  if (isLid(aa) && isPn(bb)) { knownAliases.set(aa, bb); knownAliases.set(bb, aa); }
  if (isPn(aa) && isLid(bb)) { knownAliases.set(bb, aa); knownAliases.set(aa, bb); }
}

function addPair(map, a, b) {
  if (!a || !b) return;
  if (isLid(a) && isPn(b)) { map.set(String(a), String(b)); rememberPair(a, b); }
  if (isPn(a) && isLid(b)) { map.set(String(b), String(a)); rememberPair(a, b); }
}

function buildMap(sock, msg, groupMeta) {
  const map = new Map();
  const k = msg?.key || {};
  addPair(map, k.participant, k.participantAlt);
  addPair(map, k.participant, k.participantPn);
  addPair(map, k.remoteJid, k.remoteJidAlt);
  addPair(map, k.senderLid, k.senderPn);
  addPair(map, k.participant, k.remoteJidAlt);
  addPair(map, k.remoteJid, k.participantAlt);
  addPair(map, k.remoteJid, k.participantPn);
  const root = msg?.message || {};
  const contexts = [];
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 7) return;
    if (node.contextInfo) contexts.push(node.contextInfo);
    for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value, depth + 1);
  };
  walk(root);
  for (const c of contexts) {
    addPair(map, c.participant, c.participantPn);
    addPair(map, c.participant, c.participantAlt);
    addPair(map, c.participantPn, c.participantAlt);
    addPair(map, c.participant, k.remoteJidAlt);
    addPair(map, c.participant, msg?.key?.remoteJidAlt);
    addPair(map, c.participant, msg?.key?.participantAlt);
    addPair(map, c.participant, msg?.key?.participantPn);
  }
  for (const p of groupMeta?.participants || []) {
    addPair(map, p.id, p.phoneNumber);
    addPair(map, p.id, p.jid);
    addPair(map, p.lid, p.jid);
    addPair(map, p.lid, p.phoneNumber);
  }
  addPair(map, sock?.user?.lid, sock?.user?.id);
  const me = sock?.authState?.creds?.me;
  addPair(map, me?.lid, me?.id);
  return map;
}

function resolve(jid, map) {
  const raw = String(jid || '');
  if (!raw) return raw;
  if (map?.has(raw)) return map.get(raw);
  if (knownAliases.has(raw)) return knownAliases.get(raw);
  return raw;
}

async function resolveWithSock(jid, sock, map, groupMeta) {
  const raw = String(jid || '');
  if (!raw) return raw;
  let local = resolve(raw, map);
  if (!isLid(local) && isPn(local)) return local;
  if (!isLid(local) && !isLid(raw)) return local;
  try {
    const rec = participantRecord(raw, groupMeta) || participantRecord(local, groupMeta);
    if (rec) {
      const pn = rec.phoneNumber || rec.jid || rec.participantPn || (isPn(rec.id) ? rec.id : null);
      if (pn && !isLid(pn)) {
        const normalized = isPn(pn) ? pn : (String(pn).includes('@') ? pn : `${String(pn).replace(/\D/g, '')}@s.whatsapp.net`);
        if (!isLid(normalized)) { rememberPair(raw, normalized); map?.set(raw, normalized); return normalized; }
      }
    }
  } catch {}
  try {
    const mapping = sock?.signalRepository?.lidMapping;
    if (mapping?.getPNForLID) {
      const pn = await mapping.getPNForLID(raw);
      if (pn && !isLid(pn)) {
        const normalized = isPn(pn) ? pn : `${String(pn).replace(/\D/g, '')}@s.whatsapp.net`;
        rememberPair(raw, normalized); map?.set(raw, normalized); return normalized;
      }
    }
  } catch {}
  try {
    if (typeof sock?.findUserId === 'function') {
      const found = await sock.findUserId(raw);
      const pn = found?.phoneNumber || found?.jid || found?.pn;
      if (pn && !isLid(pn)) {
        const normalized = isPn(pn) ? pn : `${String(pn).replace(/\D/g, '')}@s.whatsapp.net`;
        rememberPair(raw, normalized); map?.set(raw, normalized); return normalized;
      }
    }
  } catch {}
  return isLid(local) ? local : raw;
}

function normalizeMany(jids, map) { return [...new Set((jids || []).map(j => resolve(j, map)).filter(Boolean))]; }
async function normalizeManyWithSock(jids, sock, map, groupMeta) {
  const out = [];
  for (const j of jids || []) { const r = await resolveWithSock(j, sock, map, groupMeta); if (r) out.push(r); }
  return [...new Set(out)];
}
function number(jid, map) { return numFromJid(resolve(jid, map)); }
function participantRecord(jid, groupMeta) {
  const raw = String(jid || '');
  if (!raw) return null;
  const candidates = new Set([raw, numFromJid(raw)]);
  return (groupMeta?.participants || []).find((p) => {
    const ids = [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.participantAlt, p?.participantPn].filter(Boolean).map(String);
    return ids.some((id) => candidates.has(id) || numFromJid(id) === numFromJid(raw));
  }) || null;
}
function resolveIdentity(jid, map, groupMeta) {
  const raw = String(jid || ''), rec = participantRecord(raw, groupMeta);
  const phone = rec?.phoneNumber || rec?.jid || rec?.participantPn || (isPn(rec?.id) ? rec.id : null) || resolve(raw, map);
  const resolved = isLid(phone) ? resolve(phone, map) : phone;
  return { input: raw, jid: resolved || raw, phoneNumber: numFromJid(resolved || raw) || '', lid: rec?.lid || (isLid(raw) ? raw : ''), aliases: [...new Set([raw, rec?.id, rec?.jid, rec?.lid, rec?.phoneNumber, rec?.participantAlt, rec?.participantPn].filter(Boolean).map(String))], name: '' };
}
function selfIds(sock, map) {
  const raw = [sock?.user?.id, sock?.user?.lid, sock?.authState?.creds?.me?.id, sock?.authState?.creds?.me?.lid].filter(Boolean).map(String);
  const resolved = raw.flatMap(j => [j, resolve(j, map)]).filter(Boolean);
  return new Set(resolved.flatMap(j => [j, numFromJid(j)]).filter(Boolean));
}
function matchesAny(jid, identities = []) {
  const raw = String(jid || '');
  if (!raw) return false;
  const set = identities instanceof Set ? identities : new Set(identities);
  if (set.has(raw)) return true;
  if (isLid(raw)) return false;
  const n = numFromJid(raw);
  return !!n && set.has(n);
}
function aliases() { return new Map(knownAliases); }
module.exports = { isLid, isPn, buildMap, resolve, resolveWithSock, normalizeMany, normalizeManyWithSock, number, participantRecord, resolveIdentity, selfIds, matchesAny, aliases };
