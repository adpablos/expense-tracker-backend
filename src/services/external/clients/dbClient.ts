import { Pool, types } from 'pg';

import config from '../../../config/config';
import logger from '../../../config/logger';

// Create a new type parser for UUIDs
const parseUUID = (val: string) => val;

// Set the type parser for the UUID type (OID 2950)
if (process.env.NODE_ENV !== 'test' && types && types.setTypeParser) {
  types.setTypeParser(2950, parseUUID);
}

const createPool = (): Pool => {
  const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  });

  if (process.env.NODE_ENV !== 'test') {
    // Set up event listeners for pool
    pool.on('connect', () => {
      logger.info('Connected to the database', {
        host: config.db.host,
        database: config.db.database,
        port: config.db.port,
      });
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', {
        error: err.message,
        stack: err.stack,
        host: config.db.host,
        database: config.db.database,
      });
      process.exit(-1);
    });

    // Initial connection test
    pool
      .connect()
      .then(() => {
        logger.info('Database connection established', {
          host: config.db.host,
          database: config.db.database,
        });
      })
      .catch((err) => {
        logger.error('Error connecting to the database', {
          error: err.message,
          stack: err.stack,
          host: config.db.host,
          database: config.db.database,
        });
      });
  }

  return pool;
};

const dbClient = createPool();

export default dbClient;
