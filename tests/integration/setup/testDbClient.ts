import fs from 'fs';
import path from 'path';

import { Pool } from 'pg';

import logger from '../../../src/config/logger';

const createTestPool = (): Pool => {
  // Asegurarnos de que usamos las variables de test
  const testConfig = {
    user: process.env.DB_USER || 'test_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'expense_tracker_test',
    password: process.env.DB_PASSWORD || 'test_password',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    ssl: process.env.DB_SSL === 'true',
  };

  const pool = new Pool(testConfig);

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client in test database', {
      error: err.message,
      stack: err.stack,
    });
  });

  return pool;
};

const testDbClient = createTestPool();

export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await testDbClient.connect();
    try {
      // Verificar si las tablas existen
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'subcategories'
        );
      `);

      if (!result.rows[0].exists) {
        logger.info('Test database tables not found, initializing schema...');

        // Leer el script SQL
        const initSQL = fs.readFileSync(
          path.join(__dirname, '../../../scripts/init-db.sql'),
          'utf8'
        );

        // Ejecutar cada comando por separado
        const commands = initSQL.split(';').filter((cmd) => cmd.trim().length > 0);

        for (const command of commands) {
          try {
            await client.query(command);
          } catch (error) {
            logger.error('Error executing SQL command:', {
              command: command.slice(0, 100) + '...',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
          }
        }

        // Verificar que las tablas se crearon
        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);

        logger.info('Created tables:', {
          tables: tables.rows.map((r) => r.table_name),
        });
      } else {
        logger.info('Test database schema already exists');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error initializing test database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export default testDbClient;
