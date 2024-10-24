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
  const { host, database, port, user, password, ssl } = config.db;

  const pool = new Pool({
    user,
    host,
    database,
    password,
    port,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });

  if (process.env.NODE_ENV !== 'test') {
    const logContext = {
      host,
      database,
      port,
      environment: process.env.NODE_ENV,
    };

    // Set up event listeners for pool
    pool.on('connect', () => {
      logger.info('Database connection established', logContext);
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', {
        ...logContext,
        error: err.message,
        stack: err.stack,
      });
      process.exit(-1);
    });

    // Initial connection test
    pool.connect().catch((err) => {
      logger.error('Error connecting to the database', {
        ...logContext,
        error: err.message,
        stack: err.stack,
      });
      // Optionally exit here if you want to fail fast
      // process.exit(-1);
    });
  }

  return pool;
};

const dbClient = createPool();

export default dbClient;
