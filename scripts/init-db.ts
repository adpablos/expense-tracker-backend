import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();
// __dirname is available in CommonJS execution via ts-node; ensure it's defined
// @ts-ignore
const currentDirname: string = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

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

    const baseDir = path.join(currentDirname, 'sql');
    const files = ['01_init-db.sql', '02_init-db-data.sql'];

    for (const file of files) {
      const scriptPath = path.join(baseDir, file);
      if (fs.existsSync(scriptPath)) {
        const sqlScript = fs.readFileSync(scriptPath, 'utf8');
        await client.query(sqlScript);
        console.log(`Executed: ${file}`);
      } else {
        console.warn(`Skipping missing SQL file: ${file}`);
      }
    }

    console.log('Database initialization completed successfully');

    await client.end();
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initializeDatabase().then((r) => r);
