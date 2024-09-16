import 'reflect-metadata';
import { Household } from '../../../src/models/Household';
import { HouseholdMember } from '../../../src/models/HouseholdMember';
import { User } from '../../../src/models/User';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { UserRepository } from '../../../src/repositories/userRepository';
import { UserService } from '../../../src/services/userService';
import { UserHouseholdTransactionCoordinator } from '../../../src/transaction-coordinators/userHouseholdTransactionCoordinator';

jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/repositories/householdRepository');
jest.mock('../../../src/config/logger');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockHouseholdRepository: jest.Mocked<HouseholdRepository>;
  let mockUserHouseholdCoordinator: jest.Mocked<UserHouseholdTransactionCoordinator>;

  beforeEach(() => {
    mockUserRepository = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByAuthProviderId: jest.fn(),
      deleteUser: jest.fn(),
      removeUserFromAllHouseholds: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockHouseholdRepository = {
      create: jest.fn(),
      addMember: jest.fn(),
      getUserHouseholds: jest.fn(),
      getMembers: jest.fn(),
      deleteOrphanedHousehold: jest.fn(),
      transferHouseholdOwnership: jest.fn(),
    } as unknown as jest.Mocked<HouseholdRepository>;

    mockUserHouseholdCoordinator = {
      createUserWithHousehold: jest.fn(),
    } as unknown as jest.Mocked<UserHouseholdTransactionCoordinator>;

    userService = new UserService(
      mockUserRepository,
      mockHouseholdRepository,
      mockUserHouseholdCoordinator
    );
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123');
      const createdUser = new User('test@example.com', 'Test User', 'auth123', 'new-user-id');

      mockUserRepository.createUser.mockResolvedValue(createdUser);

      const result = await userService.createUser(user);

      expect(result).toEqual(createdUser);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(user);
    });

    it('should throw an error if user creation fails', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123');

      mockUserRepository.createUser.mockRejectedValue(new Error('Database error'));

      await expect(userService.createUser(user)).rejects.toThrow('Error creating user');
    });

    it('should throw an error for invalid user data', async () => {
      const invalidUser = new User('invalid-email', 'Test User', 'auth123');
      jest.spyOn(invalidUser, 'validate').mockReturnValue(['Invalid email']);
      await expect(userService.createUser(invalidUser)).rejects.toThrow(
        'Invalid user: Invalid email'
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const userId = 'user-id';
      const updates = { name: 'Updated Name' };
      const updatedUser = new User('test@example.com', 'Updated Name', 'auth123', userId);

      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updates);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, updates);
    });

    it('should throw an error if user update fails', async () => {
      const userId = 'user-id';
      const updates = { name: 'Updated Name' };

      mockUserRepository.updateUser.mockRejectedValue(new Error('Database error'));

      await expect(userService.updateUser(userId, updates)).rejects.toThrow('Error updating user');
    });
  });

  describe('createUserWithHousehold', () => {
    it('should create a user with a household successfully', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123');
      const householdName = 'Test Household';
      const createdUser = new User('test@example.com', 'Test User', 'auth123', 'new-user-id');
      createdUser.households = ['new-household-id'];
      const createdHousehold = new Household(householdName, 'new-household-id');

      mockUserHouseholdCoordinator.createUserWithHousehold.mockResolvedValue({
        user: createdUser,
        household: createdHousehold,
      });

      const result = await userService.createUserWithHousehold(user, householdName);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'new-user-id',
          email: 'test@example.com',
          name: 'Test User',
          authProviderId: 'auth123',
          households: ['new-household-id'],
        }),
        household: expect.objectContaining({
          id: 'new-household-id',
          name: 'Test Household',
        }),
      });
      expect(mockUserHouseholdCoordinator.createUserWithHousehold).toHaveBeenCalledWith(
        user,
        householdName
      );
    });

    it('should throw an error if user creation with household fails', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123');
      const householdName = 'Test Household';

      mockUserHouseholdCoordinator.createUserWithHousehold.mockRejectedValue(
        new Error('Database error')
      );

      await expect(userService.createUserWithHousehold(user, householdName)).rejects.toThrow(
        'Error creating user with household'
      );
    });

    it('should throw an error for invalid user data', async () => {
      const invalidUser = new User('invalid-email', 'Test User', 'auth123');
      jest.spyOn(invalidUser, 'validate').mockReturnValue(['Invalid email']);
      await expect(
        userService.createUserWithHousehold(invalidUser, 'Test Household')
      ).rejects.toThrow('Invalid user: Invalid email');
    });

    it('should throw an error if user already exists', async () => {
      const existingUser = new User(
        'existing@example.com',
        'Existing User',
        'auth123',
        'existing-id'
      );
      mockUserRepository.getUserByAuthProviderId.mockResolvedValue(existingUser);

      const newUser = new User('existing@example.com', 'Existing User', 'auth123');
      await expect(userService.createUserWithHousehold(newUser, 'New Household')).rejects.toThrow(
        'User already exists'
      );
    });

    it('should throw an error if transaction coordinator fails', async () => {
      const user = new User('test@example.com', 'Test User', 'auth123');
      const householdName = 'Test Household';

      mockUserHouseholdCoordinator.createUserWithHousehold.mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(userService.createUserWithHousehold(user, householdName)).rejects.toThrow(
        'Error creating user with household'
      );
    });
  });

  describe('getUserById', () => {
    it('should return a user when it exists', async () => {
      const userId = 'user-id';
      const mockUser = new User('test@example.com', 'Test User', 'auth123', userId);
      mockUserRepository.getUserById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(result).toEqual(mockUser);
    });

    it('should return null when the user does not exist', async () => {
      const userId = 'non-existent-id';
      mockUserRepository.getUserById.mockResolvedValue(null);

      const result = await userService.getUserById(userId);

      expect(result).toBeNull();
    });
  });

  describe('getUserByAuthProviderId', () => {
    it('should return a user when it exists', async () => {
      const authProviderId = 'auth123';
      const mockUser = new User('test@example.com', 'Test User', authProviderId, 'user-id');
      mockUserRepository.getUserByAuthProviderId.mockResolvedValue(mockUser);

      const result = await userService.getUserByAuthProviderId(authProviderId);

      expect(result).toEqual(mockUser);
    });

    it('should return null when the user does not exist', async () => {
      const authProviderId = 'non-existent-auth';
      mockUserRepository.getUserByAuthProviderId.mockResolvedValue(null);

      const result = await userService.getUserByAuthProviderId(authProviderId);

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and handle their households', async () => {
      const userId = 'user-id';
      const mockHouseholds = [
        new Household('Household 1', 'household-1'),
        new Household('Household 2', 'household-2'),
      ];

      mockHouseholdRepository.getUserHouseholds.mockResolvedValue(mockHouseholds);
      mockHouseholdRepository.getMembers.mockResolvedValue([
        new HouseholdMember(
          'household-id',
          userId,
          'owner',
          'active',
          'member-id',
          new Date(),
          new Date()
        ),
        new HouseholdMember(
          'household-id',
          'other-user',
          'member',
          'active',
          'other-member-id',
          new Date(),
          new Date()
        ),
      ]);
      mockHouseholdRepository.transferHouseholdOwnership.mockResolvedValue();
      mockUserRepository.removeUserFromAllHouseholds.mockResolvedValue();
      mockUserRepository.deleteUser.mockResolvedValue();

      await userService.deleteUser(userId);

      expect(mockHouseholdRepository.getUserHouseholds).toHaveBeenCalledWith(userId);
      expect(mockHouseholdRepository.getMembers).toHaveBeenCalledTimes(2);
      expect(mockHouseholdRepository.transferHouseholdOwnership).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.removeUserFromAllHouseholds).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should throw an error if user deletion fails', async () => {
      const userId = 'user-id';

      mockHouseholdRepository.getUserHouseholds.mockResolvedValue([]);
      mockUserRepository.removeUserFromAllHouseholds.mockResolvedValue();
      mockUserRepository.deleteUser.mockRejectedValue(new Error('Database error'));

      await expect(userService.deleteUser(userId)).rejects.toThrow('Error deleting user');
    });

    it('should delete a user and their orphaned household', async () => {
      const userId = 'user-id';
      const mockHouseholds = [new Household('Orphaned Household', 'household-1')];

      mockHouseholdRepository.getUserHouseholds.mockResolvedValue(mockHouseholds);
      mockHouseholdRepository.getMembers.mockResolvedValue([
        new HouseholdMember(
          'household-1',
          userId,
          'owner',
          'active',
          'member-id',
          new Date(),
          new Date()
        ),
      ]);
      mockHouseholdRepository.deleteOrphanedHousehold.mockResolvedValue();
      mockUserRepository.removeUserFromAllHouseholds.mockResolvedValue();
      mockUserRepository.deleteUser.mockResolvedValue();

      await userService.deleteUser(userId);

      expect(mockHouseholdRepository.deleteOrphanedHousehold).toHaveBeenCalledWith('household-1');
      expect(mockUserRepository.removeUserFromAllHouseholds).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should delete a user who is not an owner of any household', async () => {
      const userId = 'user-id';
      const mockHouseholds = [new Household('Non-owned Household', 'household-1')];

      mockHouseholdRepository.getUserHouseholds.mockResolvedValue(mockHouseholds);
      mockHouseholdRepository.getMembers.mockResolvedValue([
        new HouseholdMember(
          'household-1',
          'other-user',
          'owner',
          'active',
          'other-member-id',
          new Date(),
          new Date()
        ),
        new HouseholdMember(
          'household-1',
          userId,
          'member',
          'active',
          'member-id',
          new Date(),
          new Date()
        ),
      ]);
      mockUserRepository.removeUserFromAllHouseholds.mockResolvedValue();
      mockUserRepository.deleteUser.mockResolvedValue();

      await userService.deleteUser(userId);

      expect(mockHouseholdRepository.transferHouseholdOwnership).not.toHaveBeenCalled();
      expect(mockUserRepository.removeUserFromAllHouseholds).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});
