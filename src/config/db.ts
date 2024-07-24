import { Pool, types } from 'pg';
import config from './config';

// Create a new type parser for UUIDs
const parseUUID = (val: string) => val;

// Set the type parser for the UUID type (OID 2950)
types.setTypeParser(2950, parseUUID);

export const pool = new Pool({
    user: config.dbUser,
    host: config.dbHost,
    database: config.dbName,
    password: config.dbPassword,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false
    }
});
