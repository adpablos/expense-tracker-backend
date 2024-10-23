import { createApp } from './app';
import config from './config/config';
import { container } from './config/inversify';
import logger from './config/logger';

const app = createApp(container);

const server = app.listen(config.server.port, () => {
  logger.info(`Server running in ${config.server.nodeEnv} mode on port ${config.server.port}`);
});

// Handling not caught error messages
process.on('unhandledRejection', (err: Error) => {
  logger.info('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err: Error) => {
  logger.info('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

export default server;
