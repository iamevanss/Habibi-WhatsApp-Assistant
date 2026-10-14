# Habibi - clean server install

## Requirements
- Node.js 20.9 or newer
- A WhatsApp account dedicated to this single instance
- An AI provider key supported by the configured provider

## Install
1. Upload and extract the Habibi project ZIP into the server's application directory.
2. Copy `.env.example` to `.env`.
3. Set `WHATSAPP_PAIRING_NUMBER` to the account's international phone number using digits only.
4. Set `OWNER_IDS` to Stain's owner number in international digits-only format.
5. Add the relevant AI provider key and adjust optional integrations as needed.
6. Run `npm install`.
7. Run `npm run doctor` and `npm run check`.
8. Start with `npm start` and follow the pairing prompts.

## Single pairing
Run one Habibi instance per WhatsApp account. Do not copy the same live auth/session directory into multiple running instances. Back up session credentials securely and never commit them.

## Pterodactyl
Use a Node.js 20+ egg. Set the startup command to `npm start`. Ensure the server has write access to its application directory and persistent storage for the WhatsApp auth state and app data. Install browser dependencies only if you use browser automation features.

## Troubleshooting
- Run `npm run doctor` to inspect configuration and feature readiness.
- Run `npm run check` to check JavaScript syntax.
- Confirm `OWNER_IDS` and the pairing number are digits-only international numbers.
- If a group action fails, verify that the connected WhatsApp account has the required group-admin permissions.
- Keep `.env`, auth state, and logs containing private data out of public repositories.
