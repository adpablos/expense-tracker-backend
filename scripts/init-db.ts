import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

export async function initializeDatabase() {
  const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const sqlScript = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
    await client.query(sqlScript);
    console.log('Database initialization completed successfully');

    await client.end();
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initializeDatabase().then((r) => r);
