# Habibi WhatsApp Assistant

Habibi is Stain's real-time conversational WhatsApp assistant. It combines natural-language AI with WhatsApp group administration, moderation, games, utilities, web research, development tools, integrations, and self-healing diagnostics.

**Owner:** Stain  
**WhatsApp library:** `@whiskeysockets/baileys` `7.0.0-rc11`  
**Pairing model:** One WhatsApp account per running instance  
**Runtime:** Node.js 20.9 or newer

## What Habibi can do

- Understand normal messages in real time - no custom command prefix is required for conversational requests.
- Manage group settings and moderation, including antilink, warnings, anti-flood, welcome/goodbye settings, and member administration.
- Report group information and handle join-request workflows where WhatsApp permissions allow it.
- Post a group status/story to the current group and broadcast a status/story to all groups the connected account belongs to. Text and replied-to image/video status posts are supported.
- Play games, manage reminders and notes, and use the assistant's existing utilities.
- Use configured AI providers, web tools, MCP integrations, project tools, and optional browser/media features.
- Run startup checks and self-healing diagnostics.

The group-status posting and group-status broadcast tools were brought over from Stain's separate **Stain × Habibi** bot. The rest of the assistant remains based on the WhatsApp Agent project rather than being replaced by the bot project.

## Quick start

1. Install Node.js 20.9+.
2. Extract this project into your server directory.
3. Copy `.env.example` to `.env` and fill in your own configuration.
4. Install dependencies with `npm install`.
5. Run `npm run doctor` and `npm run check`.
6. Start Habibi with `npm start` and follow the pairing instructions.

See `INSTALL.md` and `QUICK_START.md` for details. Keep `.env`, WhatsApp auth state, API keys, and credentials private; never commit them to Git.

## Natural-language examples

- “Habibi, please turn on antilink.”
- “Habibi, check the group information.”
- “Habibi, how many pending join requests are there?”
- “Habibi, post this text as a group status.”
- “Habibi, broadcast this status to all groups.”

Group actions respect permissions and WhatsApp restrictions. Group-status broadcasting is owner-only because it posts to every group the connected account belongs to.

## Baileys version

The dependency is pinned to `@whiskeysockets/baileys` `7.0.0-rc11`, as requested. This is a release-candidate version, so review upstream breaking changes before changing it.

## Security and reliability

- Never commit `.env`, WhatsApp credentials, private session data, or provider API keys.
- Test with an isolated account and group before enabling moderation or broad status broadcasts.
- Some optional tools require API keys or system packages; unconfigured integrations may remain unavailable.

## License and attribution

Habibi is the rebranded WhatsApp Agent project maintained by Stain, with group-status posting and broadcasting adapted from Stain's separate Stain × Habibi project. Respect the upstream licenses of inherited code and dependencies.
