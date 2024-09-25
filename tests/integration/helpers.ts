// tests/integration/helpers.ts
import { Pool, PoolClient } from 'pg';

import logger from '../../src/config/logger';

export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function withRollbackTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    return result;
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

export async function createTestUser(client: PoolClient) {
  const result = await client.query(
    'INSERT INTO users (email, name, auth_provider_id) VALUES ($1, $2, $3) RETURNING *',
    ['test@example.com', 'Test User', 'auth0|123456']
  );
  return result.rows[0];
}

export async function createTestHousehold(client: PoolClient, userId: string) {
  const householdResult = await client.query(
    'INSERT INTO households (name) VALUES ($1) RETURNING *',
    ['Test Household']
  );
  const household = householdResult.rows[0];

  await client.query(
    'INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
    [household.id, userId, 'owner', 'active']
  );

  return household;
}

export async function cleanDatabase(client: PoolClient) {
  await client.query(
    'TRUNCATE TABLE subcategories, categories, household_members, households, users CASCADE'
  );
}

export async function setupTestData(client: PoolClient) {
  await cleanDatabase(client);
  const user = await createTestUser(client);
  const household = await createTestHousehold(client, user.id);
  return { user, household };
}

export function createTestSuite(suiteName: string) {
  return {
    it: (name: string, fn: () => Promise<void>, timeout?: number) => {
      return it(
        name,
        async () => {
          const fullTestName = `${suiteName} - ${name}`;
          logger.testCase(fullTestName);
          try {
            await fn();
            logger.info(`Test completed successfully: ${fullTestName}`);
          } catch (error) {
            logger.error(`Test failed: ${fullTestName}`, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
          }
        },
        timeout
      );
    },
  };
}

export async function logDatabaseState(pool: Pool) {
  const client = await pool.connect();
  try {
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const householdCount = await client.query('SELECT COUNT(*) FROM households');
    const memberCount = await client.query('SELECT COUNT(*) FROM household_members');
    logger.info('Database state logged', {
      userCount: userCount.rows[0].count,
      householdCount: householdCount.rows[0].count,
      memberCount: memberCount.rows[0].count,
    });
  } finally {
    client.release();
  }
}
