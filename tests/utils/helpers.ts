import { Pool, PoolClient } from 'pg';

import logger from '../../src/config/logger';

/**
 * Manage a database transaction by executing a provided callback.
 * @param pool - The database pool to connect to.
 * @param callback - The callback to execute within the transaction.
 * @returns A promise with the result of the callback.
 */
export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withManagedClient(pool, async (client) => {
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

/**
 * Execute a callback within a rollback-only transaction, used for testing purposes.
 * @param pool - The database pool to connect to.
 * @param callback - The callback to execute within the transaction.
 * @returns A promise with the result of the callback.
 */
export async function withRollbackTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withManagedClient(pool, async (client) => {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('ROLLBACK');
    return result;
  });
}

/**
 * Execute a callback with a managed database client.
 * @param pool - The database pool to connect to.
 * @param callback - The callback to execute using the client.
 * @returns A promise with the result of the callback.
 */
async function withManagedClient<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

/**
 * Creates a test user in the database.
 * @param client - The database client to use.
 * @returns The created test user.
 */
export async function createTestUser(client: PoolClient) {
  const { rows } = await client.query(
    'INSERT INTO users (email, name, auth_provider_id) VALUES ($1, $2, $3) RETURNING *',
    ['test@example.com', 'Test User', 'auth0|123456']
  );
  return rows[0];
}

/**
 * Creates a test household and associates it with a user.
 * @param client - The database client to use.
 * @param userId - The ID of the user to associate with the household.
 * @returns The created household.
 */
export async function createTestHousehold(client: PoolClient, userId: string) {
  const { rows: householdRows } = await client.query(
    'INSERT INTO households (name) VALUES ($1) RETURNING *',
    ['Test Household']
  );
  const household = householdRows[0];

  await client.query(
    'INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
    [household.id, userId, 'owner', 'active']
  );

  return household;
}

/**
 * Cleans the database by truncating all test-related tables.
 * @param client - The database client to use.
 */
export async function cleanDatabase(client: PoolClient) {
  await client.query(
    'TRUNCATE TABLE subcategories, categories, household_members, households, users CASCADE'
  );
}

/**
 * Sets up test data in the database.
 * @param client - The database client to use.
 * @returns The created user and household.
 */
export async function setupTestData(client: PoolClient) {
  await cleanDatabase(client);
  const user = await createTestUser(client);
  const household = await createTestHousehold(client, user.id);
  return { user, household };
}

/**
 * Creates a custom test suite wrapper that logs test case details.
 * @param suiteName - The name of the test suite.
 * @returns An object with a custom "it" function.
 */
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

/**
 * Logs the current state of the database, including user and household counts.
 * @param pool - The database pool to connect to.
 */
export async function logDatabaseState(pool: Pool) {
  await withManagedClient(pool, async (client) => {
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const householdCount = await client.query('SELECT COUNT(*) FROM households');
    const memberCount = await client.query('SELECT COUNT(*) FROM household_members');
    logger.info('Database state logged', {
      userCount: userCount.rows[0].count,
      householdCount: householdCount.rows[0].count,
      memberCount: memberCount.rows[0].count,
    });
  });
}
