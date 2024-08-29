import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { Household } from '../../../src/models/Household';
import { User } from '../../../src/models/User';
import { HouseholdService } from '../../../src/services/householdService';
import { UserService } from '../../../src/services/userService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('pg');
jest.mock('../../../src/config/logger');
jest.mock('../../../src/services/householdService');
jest.mock('../../../src/config/openaiConfig', () => ({
  __esModule: true,
  default: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked response' } }],
        }),
      },
    },
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({ text: 'Mocked transcription' }),
      },
    },
  },
}));

describe('UserService', () => {
  let userService: UserService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let mockHouseholdService: jest.Mocked<HouseholdService>;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<PoolClient>;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    mockHouseholdService = {
      createHousehold: jest.fn(),
    } as unknown as jest.Mocked<HouseholdService>;

    userService = new UserService(mockPool);
    (userService as any).householdService = mockHouseholdService;
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUser = new User('test@example.com', 'Test User', 'auth0|123456');
      const mockDbResult = { ...newUser.toDatabase(), id: uuidv4() };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDbResult] });

      const result = await userService.createUser(newUser);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO users .+ VALUES .+ RETURNING \*/),
        expect.arrayContaining([newUser.id, newUser.email, newUser.name, newUser.authProviderId])
      );
      expect(result).toBeInstanceOf(User);
      expect(result.email).toBe(newUser.email);
    });

    it('should throw an error for duplicate user', async () => {
      const newUser = new User('test@example.com', 'Test User', 'auth0|123456');
      const error: any = new Error('Duplicate key value violates unique constraint');
      error.code = '23505';
      (mockPool.query as jest.Mock).mockRejectedValueOnce(error);

      await expect(userService.createUser(newUser)).rejects.toThrow(AppError);
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const userId = uuidv4();
      const updates = { email: 'updated@example.com', name: 'Updated Name' };
      const mockUpdatedUser = { ...updates, id: userId, auth_provider_id: 'auth0|123456' };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedUser] });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ household_id: uuidv4() }] });

      const result = await userService.updateUser(userId, updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users SET .+ WHERE id = .+ RETURNING \*/),
        expect.arrayContaining([updates.email, updates.name, userId])
      );
      expect(result).toBeInstanceOf(User);
      expect(result.email).toBe(updates.email);
      expect(result.name).toBe(updates.name);
    });

    it('should throw an error when updating non-existent user', async () => {
      const userId = uuidv4();
      const updates = { email: 'updated@example.com', name: 'Updated Name' };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(userService.updateUser(userId, updates)).rejects.toThrow(AppError);
    });
  });

  describe('getUserByAuthProviderId', () => {
    it('should retrieve a user by auth provider ID', async () => {
      const authProviderId = 'auth0|123456';
      const mockUser = {
        id: uuidv4(),
        email: 'test@example.com',
        name: 'Test User',
        auth_provider_id: authProviderId,
        households: [uuidv4()],
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userService.getUserByAuthProviderId(authProviderId);

      expect(mockPool.query).toHaveBeenCalledWith(
        `SELECT u.*, array_agg(hm.household_id) as households
                 FROM users u
                 LEFT JOIN household_members hm ON u.id = hm.user_id
                 WHERE u.auth_provider_id = $1
                 GROUP BY u.id`,
        [authProviderId]
      );
      expect(result).toBeInstanceOf(User);
      expect(result?.authProviderId).toBe(authProviderId);
    });

    it('should return null for non-existent auth provider ID', async () => {
      const authProviderId = 'auth0|nonexistent';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await userService.getUserByAuthProviderId(authProviderId);

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and handle their households', async () => {
      const userId = uuidv4();
      const mockUserHouseholds = [
        { household_id: uuidv4(), role: 'owner', household_name: 'House 1', member_count: '2' },
        { household_id: uuidv4(), role: 'member', household_name: 'House 2', member_count: '3' },
      ];

      (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: mockUserHouseholds });
      (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: uuidv4() }] }); // For transferring ownership
      (mockClient.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }); // For updating household member role
      (mockClient.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2 }); // For removing user from households
      (mockClient.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }); // For deleting user

      await userService.deleteUser(userId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an error and rollback if deletion fails', async () => {
      const userId = uuidv4();

      (mockClient.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(userService.deleteUser(userId)).rejects.toThrow(AppError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createUserWithHousehold', () => {
    it('should create a user with a new household', async () => {
      const newUser = new User('test@example.com', 'Test User', 'auth0|123456');
      const householdName = 'Test Household';
      const mockDbResult = {
        id: uuidv4(),
        email: newUser.email,
        name: newUser.name,
        auth_provider_id: newUser.authProviderId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const mockHouseholdResult = new Household(householdName, uuidv4(), new Date(), new Date());

      (mockClient.query as jest.Mock).mockImplementation((sql, params) => {
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({ rows: [mockDbResult] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockHouseholdService.createHousehold.mockResolvedValueOnce(mockHouseholdResult);

      const result = await userService.createUserWithHousehold(newUser, householdName);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO users (id, email, name, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [expect.any(String), newUser.email, newUser.name, newUser.authProviderId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.email).toBe(newUser.email);
      expect(result.name).toBe(newUser.name);
      expect(result.authProviderId).toBe(newUser.authProviderId);
      expect(result.households).toContain(mockHouseholdResult.id);
      expect(mockHouseholdService.createHousehold).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const newUser = new User('test@example.com', 'Test User', 'auth0|123456');
      const householdName = 'Test Household';

      (mockClient.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(userService.createUserWithHousehold(newUser, householdName)).rejects.toThrow(
        AppError
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
