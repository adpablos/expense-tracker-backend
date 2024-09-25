// tests/integration/setup/seedDatabase.ts
import fs from 'fs';
import path from 'path';

import { PoolClient } from 'pg';

import logger from '../../../src/config/logger';

export const seedDatabase = async (client: PoolClient): Promise<void> => {
  try {
    // Eliminar todas las tablas existentes
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);

    const initDbSql = fs.readFileSync(path.join(__dirname, '../../../scripts/init-db.sql'), 'utf8');
    const initDbDataSql = fs.readFileSync(path.join(__dirname, './init-db-data.sql'), 'utf8');

    await client.query(initDbSql);
    await client.query(initDbDataSql);

    logger.info('Database seeded successfully');
  } catch (err) {
    logger.error('Error seeding database:', { error: err });
    throw err;
  }
};
