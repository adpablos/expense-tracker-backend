import { Pool, types } from 'pg';

import logger from '../config/logger';

import config from './config';

// Create a new type parser for UUIDs
const parseUUID = (val: string) => val;

// Set the type parser for the UUID type (OID 2950)
if (process.env.NODE_ENV !== 'test' && types && types.setTypeParser) {
  types.setTypeParser(2950, parseUUID);
}

const pool = new Pool({
  user: config.dbUser,
  host: config.dbHost,
  database: config.dbDatabase,
  password: config.dbPassword,
  port: config.dbPort,
  ssl: config.dbSSL ? { rejectUnauthorized: false } : false,
});

if (process.env.NODE_ENV !== 'test') {
  pool.on('connect', () => {
    logger.info('Connected to the database');
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  pool
    .connect()
    .then(() => {
      logger.info('Database connection established');
    })
    .catch((err) => {
      logger.error('Error connecting to the database', err);
    });
}

export default pool;
