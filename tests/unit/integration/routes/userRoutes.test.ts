import 'reflect-metadata';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createApp } from '../../../../src/app';
import { Household } from '../../../../src/models/Household';
import { DI_TYPES } from '../../../../src/types/di';
import { AppError } from '../../../../src/utils/AppError';
import { createTestContainer } from '../../../testContainer';
import { mockHouseholdService, mockUserService } from '../../mocks/serviceMocks';
import { mockHouseholdId, mockUserId } from '../../testUtils';

jest.mock('pg', () => require('../../mocks/pg'));

jest.mock('../../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req, res, next) => next()),
  attachUser: jest.fn((req, res, next) => {
    req.user = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      authProviderId: 'auth0|123456',
      addHousehold: jest.fn(),
    };
    req.currentHouseholdId = mockHouseholdId;
    next();
  }),
}));

const testContainer = createTestContainer();
testContainer.rebind(DI_TYPES.UserService).toConstantValue(mockUserService);
testContainer.rebind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
const app = createApp(testContainer);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return the current user', async () => {
      (mockUserService.getUserByAuthProviderId as jest.Mock).mockResolvedValueOnce({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        authProviderId: 'auth0|123456',
      });

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        authProviderId: 'auth0|123456',
      });
    });

    it('should return 404 if user not found', async () => {
      (mockUserService.getUserByAuthProviderId as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'newuser@example.com',
        name: 'New User',
        auth_provider_id: 'auth0|newuser123',
      };

      const mockCreatedHousehold = Household.fromDatabase({
        id: uuidv4(),
        name: 'New Household',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const mockCreatedUser = {
        id: uuidv4(),
        ...newUser,
        addHousehold: jest.fn(),
      };
      (mockUserService.createUserWithHousehold as jest.Mock).mockResolvedValueOnce({
        user: mockCreatedUser,
        household: mockCreatedHousehold,
      });

      (mockHouseholdService.createHousehold as jest.Mock).mockResolvedValueOnce(
        mockCreatedHousehold
      );

      const response = await request(app).post('/api/users').send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.user).toMatchObject({
        id: expect.any(String),
        email: newUser.email,
        name: newUser.name,
        authProviderId: newUser.auth_provider_id,
      });
      expect(response.body.household).toEqual({
        id: mockCreatedHousehold.id,
        name: mockCreatedHousehold.name,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(mockHouseholdService.createHousehold).toHaveBeenCalledWith(
        expect.any(Household),
        expect.objectContaining({
          email: newUser.email,
          name: newUser.name,
          authProviderId: newUser.auth_provider_id,
        })
      );
    });

    it('should return 409 if user already exists', async () => {
      const existingUser = {
        email: 'existing@example.com',
        name: 'Existing User',
        auth_provider_id: 'auth0|existing123',
      };

      (mockHouseholdService.createHousehold as jest.Mock).mockRejectedValueOnce(
        new AppError('Duplicate entry: User or Household already exists', 409)
      );

      const response = await request(app).post('/api/users').send(existingUser);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Duplicate entry: User or Household already exists',
      });
    });
  });

  describe('GET /api/users/me/households', () => {
    it('should return all households for the current user', async () => {
      const mockHouseholds = [
        { id: mockHouseholdId, name: 'Home', createdAt: new Date(), updatedAt: new Date() },
        { id: uuidv4(), name: 'Work', createdAt: new Date(), updatedAt: new Date() },
      ];

      (mockHouseholdService.getUserHouseholds as jest.Mock).mockResolvedValueOnce(mockHouseholds);

      const response = await request(app)
        .get('/api/users/me/households')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', mockHouseholdId);
      expect(response.body[0]).toHaveProperty('name', 'Home');
      expect(response.body[1]).toHaveProperty('name', 'Work');
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update the current user profile', async () => {
      const updatedUserData = {
        email: 'updated@example.com',
        name: 'Updated User',
      };

      const mockUpdatedUser = {
        id: mockUserId,
        ...updatedUserData,
        authProviderId: 'auth0|123456',
      };

      (mockUserService.updateUser as jest.Mock).mockResolvedValueOnce(mockUpdatedUser);

      const response = await request(app)
        .put('/api/users/me')
        .send(updatedUserData)
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(updatedUserData);
    });

    it('should return 409 when trying to update email to one that already exists', async () => {
      const updatedUserData = {
        email: 'existing@example.com',
        name: 'Updated User',
      };

      (mockUserService.updateUser as jest.Mock).mockRejectedValueOnce(
        new AppError('Email already in use', 409)
      );

      const response = await request(app)
        .put('/api/users/me')
        .send(updatedUserData)
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Email already in use',
      });
    });
  });

  describe('DELETE /api/users/me', () => {
    it('should delete the current user account', async () => {
      (mockUserService.deleteUser as jest.Mock).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer mock_token');

      expect(response.status).toBe(204);
    });
  });
});
