import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { UserController } from '../../../src/controllers/userController';
import { errorHandler } from '../../../src/middleware/errorHandler';
import userRoutes from '../../../src/routes/userRoutes';
import { DI_TYPES } from '../../../src/types/di';
import { AppError } from '../../../src/utils/AppError';
import { createMockAuthMiddleware } from '../mocks/middlewareMocks';
import { mockUserService, mockHouseholdService } from '../mocks/serviceMocks';

const mockUserId = uuidv4();

// Mock middleware
const mockAuthMiddleware = createMockAuthMiddleware(mockUserId);

const container = new Container();
container.bind(DI_TYPES.UserService).toConstantValue(mockUserService);
container.bind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
container.bind(DI_TYPES.AuthMiddleware).toConstantValue(mockAuthMiddleware);
container.bind(DI_TYPES.UserController).to(UserController);

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes(container));
app.use(errorHandler);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return the current user', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        authProviderId: 'auth0|123456',
      };

      mockUserService.getUserByAuthProviderId.mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mockToken');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      mockUserService.getUserByAuthProviderId.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mockToken');

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

      const mockCreatedHousehold = {
        id: 'household-id-123',
        name: `${newUser.name}'s Household`,
        createdAt: '2024-09-01T00:00:00.000Z',
        updatedAt: '2024-09-01T00:00:00.000Z',
      };

      const mockCreatedUser = {
        id: 'user-id-123',
        email: newUser.email,
        name: newUser.name,
        authProviderId: newUser.auth_provider_id,
        households: [mockCreatedHousehold.id],
      };

      mockUserService.createUserWithHousehold.mockResolvedValueOnce({
        user: mockCreatedUser,
        household: mockCreatedHousehold,
      });

      const response = await request(app).post('/api/users').send(newUser);

      expect(response.status).toBe(201);

      expect(response.body).toEqual({
        user: expect.objectContaining({
          id: mockCreatedUser.id,
          email: mockCreatedUser.email,
          name: mockCreatedUser.name,
          authProviderId: mockCreatedUser.authProviderId,
          households: [mockCreatedHousehold.id],
        }),
        household: expect.objectContaining({
          id: mockCreatedHousehold.id,
          name: mockCreatedHousehold.name,
          createdAt: mockCreatedHousehold.createdAt,
          updatedAt: mockCreatedHousehold.updatedAt,
        }),
      });
    });

    it('should return 409 if user already exists', async () => {
      const existingUser = {
        email: 'existing@example.com',
        name: 'Existing User',
        auth_provider_id: 'auth0|existing123',
      };

      mockUserService.createUserWithHousehold.mockRejectedValueOnce(
        new AppError('User already exists', 409)
      );

      const response = await request(app).post('/api/users').send(existingUser);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: 'error',
        message: 'User already exists',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteUser = {
        email: 'incomplete@example.com',
      };

      const response = await request(app).post('/api/users').send(incompleteUser);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Email, name, and auth_provider_id are required',
      });
    });

    it('should return 500 if there is an internal server error', async () => {
      const newUser = {
        email: 'newuser@example.com',
        name: 'New User',
        auth_provider_id: 'auth0|newuser123',
      };

      // Simulate general database error
      mockUserService.createUserWithHousehold.mockRejectedValueOnce(
        new AppError('Unexpected error', 500)
      );

      const response = await request(app).post('/api/users').send(newUser);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Unexpected error',
      });
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update the current user', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const updatedUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Updated Name',
        authProviderId: 'auth0|123456',
      };

      mockUserService.updateUser.mockResolvedValueOnce(updatedUser);

      const response = await request(app)
        .put('/api/users/me')
        .send(updateData)
        .set('Authorization', 'Bearer mockToken');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedUser);
    });

    it('should return 404 if user not found', async () => {
      mockUserService.updateUser.mockRejectedValueOnce(new AppError('User not found', 404));

      const response = await request(app)
        .put('/api/users/me')
        .send({ name: 'Updated Name' })
        .set('Authorization', 'Bearer mockToken');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'User not found',
      });
    });
  });

  describe('DELETE /api/users/me', () => {
    it('should delete the current user', async () => {
      mockUserService.deleteUser.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer mockToken');

      expect(response.status).toBe(204);
    });

    it('should return 404 if user not found', async () => {
      mockUserService.deleteUser.mockRejectedValueOnce(new AppError('User not found', 404));

      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer mockToken');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'User not found',
      });
    });
  });
});
