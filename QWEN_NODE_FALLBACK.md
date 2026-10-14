# Qwen Node.js fallback

The bot now includes the Qwen HTTP implementation supplied in the scraper source.

Endpoint:
`https://tools.kaminoater.top/ai/qwen`

No API key is required by the supplied endpoint.

Use it manually:
`model qwen`

It is also an automatic fallback after the active remote provider fails (including NVIDIA 429s).

Optional `.env` override:
`QWEN_MODEL=qwen`

## Ollama

Ollama does not run *inside* Node.js. Node can call an Ollama HTTP server, but the Ollama daemon must already be installed/running on the panel or another reachable machine. The existing Ollama provider is therefore kept as an optional local provider, not as the required free fallback.
