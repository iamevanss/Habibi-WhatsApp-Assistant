# Free no-key AI fallback

NVIDIA NIM 429 responses are now treated as rate-limit failures instead of being retried against the same exhausted key. The client tries the NVIDIA fallback model once, then automatically falls back to local Ollama.

Ollama requires no API key. It must be installed on the same server as the bot and have a model pulled.

Recommended:

```bash
ollama pull qwen3:4b
```

Environment:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=qwen3:4b
OLLAMA_FALLBACK_MODEL=llama3.2:3b
```

If Ollama is unavailable, the bot keeps the original provider error instead of pretending a public no-key cloud model is guaranteed. Public free endpoints change their authentication and rate limits frequently, so the reliable no-API-key option is local inference.
