'use strict';
function buildAndroidPrompt(text, options = {}) { return { role: 'user', content: String(text ?? ''), metadata: { platform: 'android', model: options.model || null, timestamp: new Date().toISOString() } }; }
function parseModelResponse(response) { if (typeof response === 'string') return response; if (!response || typeof response !== 'object') return ''; return response.output_text || response.response || response.text || response.message?.content || response.choices?.[0]?.message?.content || ''; }
module.exports = { buildAndroidPrompt, parseModelResponse };
