/* eslint-disable import/order */
import path from 'path';

import dotenv from 'dotenv';

// Cargar variables de entorno específicas para tests
const result = dotenv.config({
  path: path.resolve(__dirname, '../../../.env.test'),
  override: true,
});

if (result.error) {
  throw new Error(`Error loading .env.test file: ${result.error.message}`);
}

// Verificar que las variables críticas están cargadas
const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_HOST', 'DB_PORT'];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

import 'reflect-metadata';
import { Container } from 'inversify';

import logger from '../../../src/config/logger';
import { cleanDatabase } from '../helpers';

import { createIntegrationTestContainer } from '../../config/testContainers';
import { TestData } from './testData';
import testDbClient, { initializeDatabase } from './testDbClient';

export let container: Container;
export let testData: TestData;

beforeAll(async () => {
  try {
    await initializeDatabase();
    // Usar el nuevo contenedor de integración con la base de datos de test
    container = createIntegrationTestContainer({
      useTestDb: true,
    });

    logger.info('Test setup completed', {
      database: process.env.DB_DATABASE || 'expense_tracker_test',
      port: process.env.DB_PORT || '5433',
    });
  } catch (error) {
    logger.error('Error in test setup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

beforeEach(async () => {
  const client = await testDbClient.connect();
  try {
    await client.query('BEGIN');
    await cleanDatabase(client);

    const newTestData = new TestData();
    await newTestData.initialize(client);
    testData = newTestData;

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

afterAll(async () => {
  await testDbClient.end();
  await container.unbindAll();
});
