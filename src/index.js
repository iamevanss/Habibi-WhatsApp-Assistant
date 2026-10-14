// Main application entry point.
require('dotenv').config();

const logger = require('./logger');

async function main() {
  logger.info?.('Habibi WhatsApp Assistant starting');
  // Connection and Telegram bridge startup are wired by the deployment entrypoint.
}

if (require.main === module) {
  main().catch(error => {
    logger.error?.('Startup failed', error);
    process.exitCode = 1;
  });
}

module.exports = { main };
