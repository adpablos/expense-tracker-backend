import { Pool, types } from 'pg';
import config from './config';

// Create a new type parser for UUIDs
const parseUUID = (val: string) => val;

// Set the type parser for the UUID type (OID 2950)
types.setTypeParser(2950, parseUUID);

const pool = new Pool({
    user: config.dbUser,
    host: config.dbHost,
    database: config.dbDatabase,
    password: config.dbPassword,
    port: config.dbPort,
    ssl: config.dbSSL ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.connect().then(() => {
    console.log('Database connection established');
}).catch((err) => {
    console.error('Error connecting to the database', err);
});

export default pool;
