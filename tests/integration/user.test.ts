import { Pool } from 'pg';
import request from 'supertest';

import { createApp } from '../../src/app';
import { DI_TYPES } from '../../src/config/di';
import logger from '../../src/config/logger';
import { ROLES, STATUS } from '../../src/constants';
import { HouseholdMember } from '../../src/models/HouseholdMember';
import { User } from '../../src/models/User';
import { HouseholdRepository } from '../../src/repositories/householdRepository';
import { UserRepository } from '../../src/repositories/userRepository';

import { logDatabaseState } from './helpers';
import { mockAuthMiddleware } from './mocks/mockAuthMiddleware';
import { mockMiddlewares } from './mocks/mockMiddlewares';
import { container, testData } from './setup/jest.setup';

interface TestUser {
  id: string;
  email: string;
  name: string;
}

interface TestHousehold {
  id: string;
  name: string;
}

describe('Users API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let pool: Pool;
  let testUser: TestUser;
  let testHousehold: TestHousehold;

  beforeAll(async () => {
    logger.testSuite('Users API Integration Tests');
    try {
      mockMiddlewares();
      app = createApp(container);
      mockAuthMiddleware(container);
      pool = container.get<Pool>(DI_TYPES.DbPool);

      logger.info('Test setup completed successfully');
    } catch (error) {
      logger.error('Test setup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  });

  beforeEach(async () => {
    const userRepository = container.get<UserRepository>(DI_TYPES.UserRepository);
    const householdRepository = container.get<HouseholdRepository>(DI_TYPES.HouseholdRepository);

    testUser = (await userRepository.getUserById(testData.testUser.id)) as TestUser;
    testHousehold = (await householdRepository.getHouseholdById(
      testData.testHousehold.id
    )) as TestHousehold;

    if (!testUser || !testHousehold) {
      throw new Error('Failed to initialize testUser or testHousehold');
    }
  });

  describe('POST /api/users', () => {
    beforeAll(() => {
      logger.testDescribe('POST /api/users');
    });

    test('should create a new user with a household', async () => {
      logger.testCase('should create a new user with a household');
      await logDatabaseState(pool);

      const response = await request(app).post('/api/users').send({
        email: 'newuser@example.com',
        name: 'New User',
        auth_provider_id: 'auth0|123456789',
      });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user.id).toBeDefined();
      expect(response.body.household).toBeDefined();
      expect(response.body.household.name).toBe("New User's Household");
      expect(response.body.household.id).toBeDefined();
    });

    test('should return 400 if required fields are missing', async () => {
      logger.testCase('should return 400 if required fields are missing');
      await logDatabaseState(pool);

      const response = await request(app).post('/api/users').send({
        email: 'incomplete@example.com',
      });

      expect(response.status).toBe(400);
    });

    test('should return 409 if user email already exists', async () => {
      logger.testCase('should return 409 if user email already exists');
      await logDatabaseState(pool);

      const existingUsers = await pool.query('SELECT * FROM users');
      logger.debug('Existing users count', { count: existingUsers.rowCount });

      if (!testUser || !testUser.email) {
        logger.error('testUser or testUser.email is undefined');
        throw new Error('testUser or testUser.email is undefined');
      }

      const response = await request(app).post('/api/users').send({
        email: testUser.email,
        name: 'Duplicate User',
        auth_provider_id: 'auth0|987654321',
      });

      logger.debug('Duplicate user creation attempt', {
        status: response.status,
        email: testUser.email,
      });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/users/me', () => {
    beforeAll(() => {
      logger.testDescribe('GET /api/users/me');
    });

    test('should return 401 if not authenticated', async () => {
      logger.testCase('should return 401 if not authenticated');
      await logDatabaseState(pool);

      const response = await request(app).get('/api/users/me');
      expect(response.status).toBe(401);
    });

    test('should retrieve the current user when authenticated', async () => {
      logger.testCase('should retrieve the current user when authenticated');
      await logDatabaseState(pool);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer fake-token');

      logger.info('Get current user response', {
        status: response.status,
        body: response.body,
      });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.name).toBe('Test User');
      expect(response.body.authProviderId).toBe('auth0|123456');
    });
  });

  describe('PUT /api/users/me', () => {
    beforeAll(() => {
      logger.testDescribe('PUT /api/users/me');
    });

    test('should update the current user', async () => {
      logger.testCase('should update the current user');
      await logDatabaseState(pool);

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer fake-token')
        .send({
          name: 'Updated Name',
          email: 'updated@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe('updated@example.com');
    });

    test('should return 409 if trying to update to an existing email', async () => {
      logger.testCase('should return 409 if trying to update to an existing email');
      await logDatabaseState(pool);

      await request(app).post('/api/users').send({
        email: 'existing@example.com',
        name: 'Existing User',
        auth_provider_id: 'auth0|existinguser',
      });

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer fake-token')
        .send({
          email: 'existing@example.com',
        });
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message', 'Email already in use');
    });

    test('should return 401 if not authenticated', async () => {
      logger.testCase('should return 401 if not authenticated');
      await logDatabaseState(pool);

      const response = await request(app).put('/api/users/me').send({
        name: 'Updated Name',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/users/me', () => {
    beforeAll(() => {
      logger.testDescribe('DELETE /api/users/me');
    });

    test('should transfer household ownership when deleting the owner', async () => {
      logger.testCase('should transfer household ownership when deleting the owner');
      await logDatabaseState(pool);

      const householdRepository = container.get<HouseholdRepository>(DI_TYPES.HouseholdRepository);
      const userRepository = container.get<UserRepository>(DI_TYPES.UserRepository);

      const newUser = await userRepository.createUser(
        new User('another@example.com', 'Another User', 'auth0|444555666')
      );
      logger.debug('New user created', { userId: newUser.id });

      await householdRepository.addMember(
        new HouseholdMember(testData.testHousehold.id, newUser.id, ROLES.MEMBER, STATUS.ACTIVE)
      );

      const initialMembers = await householdRepository.getMembers(testData.testHousehold.id);
      logger.debug('Initial household members', {
        householdId: testData.testHousehold.id,
        memberCount: initialMembers.length,
      });

      logger.debug('Before deletion - Test user state', await getUserState(testData.testUser.id));
      logger.debug('Before deletion - New user state', await getUserState(newUser.id));
      logger.debug(
        'Before deletion - Household state',
        await getHouseholdState(testData.testHousehold.id)
      );

      const deleteResponse = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer fake-token`);

      logger.debug('User deletion attempt', {
        status: deleteResponse.status,
        userId: testData.testUser.id,
      });

      expect(deleteResponse.status).toBe(204);

      logger.debug('After deletion - Test user state', await getUserState(testData.testUser.id));
      logger.debug('After deletion - New user state', await getUserState(newUser.id));
      logger.debug(
        'After deletion - Household state',
        await getHouseholdState(testData.testHousehold.id)
      );

      const members = await householdRepository.getMembers(testData.testHousehold.id);
      const newOwner = members.find((member) => member.role === ROLES.OWNER);

      logger.debug('Household ownership transfer result', {
        householdId: testData.testHousehold.id,
        newOwnerId: newOwner?.userId,
        memberCount: members.length,
      });

      expect(newOwner).toBeDefined();
      expect(newOwner?.userId).not.toBe(testData.testUser.id);

      const deletedUser = await userRepository.getUserById(testData.testUser.id);
      expect(deletedUser).toBeNull();

      expect(members.length).toBe(initialMembers.length - 1);
    });
  });

  describe('GET /api/users/me/households', () => {
    beforeAll(() => {
      logger.testDescribe('GET /api/users/me/households');
    });

    test('should retrieve all households for the authenticated user', async () => {
      logger.testCase('should retrieve all households for the authenticated user');
      await logDatabaseState(pool);

      const response = await request(app)
        .get('/api/users/me/households')
        .set('Authorization', 'Bearer fake-token');

      logger.info('Get user households response', {
        status: response.status,
        body: response.body,
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe(testHousehold.name);
    });

    test('should return an empty array if authenticated user has no households', async () => {
      logger.testCase('should return an empty array if authenticated user has no households');
      await logDatabaseState(pool);

      // Create a new user without households using the UserRepository
      const userRepository = container.get<UserRepository>(DI_TYPES.UserRepository);
      const newUser = await userRepository.createUser(
        new User('nohousehold@example.com', 'No Household User', 'auth0|777888999')
      );

      // Use the auth provider ID to simulate authentication
      const authProviderId = newUser.authProviderId;
      logger.debug('New user created for test', { userId: newUser.id, authProviderId });

      // Make the request with a token that simulates being this new user
      const response = await request(app)
        .get('/api/users/me/households')
        .set('Authorization', `Bearer fake-token-${authProviderId}`);

      logger.debug('Response received', {
        status: response.status,
        body: response.body,
        headers: response.headers,
      });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    test('should return 401 if not authenticated', async () => {
      logger.testCase('should return 401 if not authenticated');
      await logDatabaseState(pool);

      const response = await request(app).get('/api/users/me/households');

      logger.info('Response received', {
        status: response.status,
        body: response.body,
      });

      expect(response.status).toBe(401);
    });
  });

  // Add more tests for other user-related endpoints and edge cases
});

async function getUserState(userId: string) {
  const userRepository = container.get<UserRepository>(DI_TYPES.UserRepository);
  const user = await userRepository.getUserById(userId);
  return {
    exists: !!user,
    id: user?.id,
    email: user?.email,
    name: user?.name,
  };
}

async function getHouseholdState(householdId: string) {
  const householdRepository = container.get<HouseholdRepository>(DI_TYPES.HouseholdRepository);
  const household = await householdRepository.getHouseholdById(householdId);
  const members = await householdRepository.getMembers(householdId);
  return {
    exists: !!household,
    id: household?.id,
    name: household?.name,
    memberCount: members.length,
    memberIds: members.map((m) => m.userId),
  };
}
