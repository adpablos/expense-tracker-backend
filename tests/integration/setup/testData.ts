// tests/integration/setup/testData.ts
import { PoolClient } from 'pg';

import logger from '../../../src/config/logger';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  auth_provider_id: string; // Añadir este campo si no existe
}

export interface TestHousehold {
  id: string;
  name: string;
  members: TestUser[];
}

export class TestData {
  private _testUser: TestUser | null = null;
  private _testHousehold: TestHousehold | null = null;

  constructor() {}

  async initialize(client: PoolClient): Promise<void> {
    await this.loadTestData(client);
  }

  private async loadTestData(client: PoolClient): Promise<void> {
    // Load or create the test user
    let userResult = await client.query('SELECT * FROM users WHERE email = $1', [
      'test@example.com',
    ]);
    if (userResult.rows.length === 0) {
      logger.info('Test user not found, creating one');
      userResult = await client.query(
        'INSERT INTO users (email, name, auth_provider_id) VALUES ($1, $2, $3) RETURNING *',
        ['test@example.com', 'Test User', 'auth0|123456']
      );
    }
    this._testUser = userResult.rows[0] as TestUser;

    // Load or create the test household
    let householdResult = await client.query('SELECT * FROM households WHERE name = $1', [
      'Test Household',
    ]);
    if (householdResult.rows.length === 0) {
      logger.info('Test household not found, creating one');
      householdResult = await client.query(
        'INSERT INTO households (name) VALUES ($1) RETURNING *',
        ['Test Household']
      );
    }
    this._testHousehold = householdResult.rows[0] as TestHousehold;

    // Associate the test user with the test household
    if (this._testUser && this._testHousehold) {
      await client.query(
        'INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [this._testHousehold.id, this._testUser.id, 'OWNER', 'ACTIVE']
      );
    }
  }

  get testUser(): TestUser {
    if (!this._testUser) {
      throw new Error('Test user not initialized. Make sure to call loadTestData() first.');
    }
    return this._testUser;
  }

  get testHousehold(): TestHousehold {
    if (!this._testHousehold) {
      throw new Error('Test household not initialized. Make sure to call loadTestData() first.');
    }
    return this._testHousehold;
  }
}
