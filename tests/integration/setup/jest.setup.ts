import 'reflect-metadata';
import dotenv from 'dotenv';
import { Container } from 'inversify';
import { Pool } from 'pg';

import logger from '../../../src/config/logger';
import { DI_TYPES } from '../../../src/config/di';
import { cleanDatabase } from '../helpers';

import { createTestContainer } from './testContainer';
import { TestData } from './testData';

dotenv.config({ path: '.env.test' });

export let container: Container;
let pool: Pool;
export let testData: TestData;

beforeAll(async () => {
  container = createTestContainer();
  pool = container.get<Pool>(DI_TYPES.DbPool);
  logger.info('Test setup completed');
});

beforeEach(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await cleanDatabase(client);

    // Recreate test data
    const newTestData = new TestData();
    await newTestData.initialize(client);
    testData = newTestData;

    await client.query('COMMIT');
    logger.info('Database cleaned and test data recreated before test');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

afterAll(async () => {
  await pool.end();
  await container.unbindAll();
});
