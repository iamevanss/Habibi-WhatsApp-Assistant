// personas.js — small personality presets for the assistant
const PERSONAS = {
  default: { name: 'Habibi', style: 'helpful, clear, warm and concise' },
  coder: { name: 'Code Assistant', style: 'technical, precise, practical, prioritise working code' },
  tutor: { name: 'Tutor', style: 'patient, step-by-step, explain concepts and check understanding' },
  casual: { name: 'Habibi', style: 'casual, friendly, natural and conversational' },
  professional: { name: 'Assistant', style: 'professional, structured and direct' },
};
function getPersona(name) { return PERSONAS[String(name || 'default').toLowerCase()] || PERSONAS.default; }
function listPersonas() { return Object.entries(PERSONAS).map(([id, value]) => ({ id, ...value })); }
module.exports = { PERSONAS, getPersona, listPersonas };
