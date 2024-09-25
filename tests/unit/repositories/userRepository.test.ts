import 'reflect-metadata';
import { Pool } from 'pg';

import { User } from '../../../src/models/User';
import { UserRepository } from '../../../src/repositories/userRepository';
import { DI_TYPES } from '../../../src/types/di';
import { AppError } from '../../../src/utils/AppError';
import { createRepositoryTestContainer } from '../../testContainer';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const container = createRepositoryTestContainer();
    mockPool = container.get<Pool>(DI_TYPES.DbPool) as jest.Mocked<Pool>;
    userRepository = container.get<UserRepository>(DI_TYPES.UserRepository);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123456');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'new-id',
            email: 'test@example.com',
            name: 'Test User',
            auth_provider_id: 'auth123456',
          },
        ],
      });

      const result = await userRepository.createUser(user);

      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe('new-id');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.authProviderId).toBe('auth123456');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([expect.any(String), 'test@example.com', 'Test User', 'auth123456'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if user creation fails', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123456');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(userRepository.createUser(user)).rejects.toThrow(AppError);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if user already exists', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123456');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      const error = new Error('Duplicate key value') as Error & { code?: string };
      error.code = '23505';
      mockClient.query.mockRejectedValueOnce(error);

      await expect(userRepository.createUser(user)).rejects.toThrow(AppError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const userId = 'user-id';
      const updates = { email: 'updated@example.com', name: 'Updated Name' };
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'updated@example.com',
            name: 'Updated Name',
            auth_provider_id: 'auth0|123456',
          },
        ],
      });

      const result = await userRepository.updateUser(userId, updates);

      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(userId);
      expect(result.email).toBe('updated@example.com');
      expect(result.name).toBe('Updated Name');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        expect.arrayContaining(['updated@example.com', 'Updated Name', userId])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if user not found', async () => {
      const userId = 'non-existent-id';
      const updates = { email: 'updated@example.com', name: 'Updated Name' };
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(userRepository.updateUser(userId, updates)).rejects.toThrow(AppError);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if email is already in use', async () => {
      const userId = 'user-id';
      const updates = { email: 'existing@example.com', name: 'Updated Name' };
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      const error = new Error('Duplicate key value') as Error & { code?: string };
      error.code = '23505';
      mockClient.query.mockRejectedValueOnce(error);

      await expect(userRepository.updateUser(userId, updates)).rejects.toThrow(AppError);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update user households if provided', async () => {
      const userId = 'user-id';
      const updates = {
        email: 'updated@example.com',
        name: 'Updated Name',
        households: ['household1', 'household2'],
      };
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'updated@example.com',
            name: 'Updated Name',
            auth_provider_id: 'auth0|123456',
          },
        ],
      });

      await userRepository.updateUser(userId, updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM household_members'),
        [userId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO household_members'),
        [userId, 'household1']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO household_members'),
        [userId, 'household2']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return a user when it exists', async () => {
      const userId = 'user-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'test@example.com',
            name: 'Test User',
            auth_provider_id: 'auth0|123456',
          },
        ],
      });

      const result = await userRepository.getUserById(userId);

      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe(userId);
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when the user does not exist', async () => {
      const userId = 'non-existent-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await userRepository.getUserById(userId);

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const userId = 'user-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      await expect(userRepository.deleteUser(userId)).resolves.not.toThrow();
    });

    it('should throw an error if user not found', async () => {
      const userId = 'non-existent-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      await expect(userRepository.deleteUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUserByAuthProviderId', () => {
    it('should return a user when it exists', async () => {
      const authProviderId = 'auth0|123456';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'user-id',
            email: 'test@example.com',
            name: 'Test User',
            auth_provider_id: authProviderId,
            households: ['household-id'],
          },
        ],
      });

      const result = await userRepository.getUserByAuthProviderId(authProviderId);

      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe('user-id');
      expect(result?.email).toBe('test@example.com');
      expect(result?.authProviderId).toBe(authProviderId);
      expect(result?.households).toContain('household-id');
    });

    it('should return null when the user does not exist', async () => {
      const authProviderId = 'non-existent-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await userRepository.getUserByAuthProviderId(authProviderId);

      expect(result).toBeNull();
    });
  });

  describe('removeUserFromAllHouseholds', () => {
    it('should remove user from all households', async () => {
      const userId = 'user-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2 });

      await expect(userRepository.removeUserFromAllHouseholds(userId)).resolves.not.toThrow();
    });
  });
});
