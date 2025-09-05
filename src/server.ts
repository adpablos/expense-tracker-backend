import { createApp } from './app';
import config from './config/config';
import { container } from './config/inversify';
import logger from './config/logger';
import dbClient from './services/external/clients/dbClient';

const app = createApp(container);

const server = app.listen(config.server.port, () => {
  logger.info(`Server running in ${config.server.nodeEnv} mode on port ${config.server.port}`);
});

// Handling not caught error messages
process.on('unhandledRejection', (err: Error) => {
  logger.info('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  shutdown(1);
});

process.on('uncaughtException', (err: Error) => {
  logger.info('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  shutdown(1);
});

const shutdown = (code = 0) => {
  server.close(async () => {
    try {
      await dbClient.end();
      logger.info('Database pool closed');
    } catch (e) {
      logger.error('Error closing DB pool', (e as Error).message);
    } finally {
      process.exit(code);
    }
  });
};

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal as NodeJS.Signals, () => {
    logger.info(`Received ${signal}. Graceful shutdown...`);
    shutdown(0);
  });
});

export default server;
