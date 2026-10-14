# Habibi - Quick Start

Habibi is a real-time WhatsApp agent. Talk to it naturally; conversational requests do not need a custom command prefix.

## Install

```bash
cp .env.example .env
# Edit .env and configure the AI provider, owner number, and WhatsApp pairing number.
npm install
npm run doctor
npm run check
npm start
```

Use Node.js 20.9 or newer. Pair one WhatsApp account to each running instance. Keep `.env` and WhatsApp authentication data private.

## Examples

- “Habibi, please turn on antilink.”
- “Habibi, check how many pending requests there are.”
- “Habibi, show me this group's information.”
- “Habibi, post this text as a group status.”
- “Habibi, broadcast this status to every group.”
- “Habibi, remind me tomorrow to finish my assignment.”

Habibi uses the AI tool layer to perform actions. Group administration actions respect sender permissions and the connected account's WhatsApp permissions. Group-status broadcast is owner-only. For media status posts, reply to an image or video and ask Habibi to post it, optionally with a caption.

## Troubleshooting

- `npm run doctor` checks the project and local requirements.
- `npm run check` checks JavaScript syntax.
- Verify `OWNER_IDS` and `WHATSAPP_PAIRING_NUMBER` use international digits-only numbers.
- If a group action is rejected, confirm the connected account has the required group-admin privileges.
