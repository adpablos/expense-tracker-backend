import 'reflect-metadata';
import { Pool, PoolClient } from 'pg';

import { Household } from '../../../src/models/Household';
import { HouseholdMember } from '../../../src/models/HouseholdMember';
import { User } from '../../../src/models/User';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { UserRepository } from '../../../src/repositories/userRepository';
import { UserHouseholdTransactionCoordinator } from '../../../src/transaction-coordinators/userHouseholdTransactionCoordinator';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/repositories/householdRepository');

describe('UserHouseholdTransactionCoordinator', () => {
  let coordinator: UserHouseholdTransactionCoordinator;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockHouseholdRepository: jest.Mocked<HouseholdRepository>;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    mockUserRepository = {
      createUserWithClient: jest.fn(),
      updateUserWithClient: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockHouseholdRepository = {
      createWithClient: jest.fn(),
      addMemberWithClient: jest.fn(),
    } as unknown as jest.Mocked<HouseholdRepository>;

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<PoolClient>;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    } as unknown as jest.Mocked<Pool>;

    coordinator = new UserHouseholdTransactionCoordinator(
      mockUserRepository,
      mockHouseholdRepository,
      mockPool
    );
  });

  it('should successfully create a user with a household', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';
    const createdUser = new User('test@example.com', 'Test User', 'auth123', 'user-id');
    const createdHousehold = new Household(householdName, 'household-id');

    mockUserRepository.createUserWithClient.mockResolvedValue(createdUser);
    mockHouseholdRepository.createWithClient.mockResolvedValue(createdHousehold);
    mockHouseholdRepository.addMemberWithClient.mockResolvedValue();
    mockUserRepository.updateUserWithClient.mockResolvedValue(createdUser);

    const result = await coordinator.createUserWithHousehold(user, householdName);

    expect(result).toEqual({
      user: expect.objectContaining({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        authProviderId: 'auth123',
        households: ['household-id'],
      }),
      household: expect.objectContaining({
        id: 'household-id',
        name: 'Test Household',
      }),
    });

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should create a HouseholdMember with correct properties', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';
    const createdUser = new User('test@example.com', 'Test User', 'auth123', 'user-id');
    const createdHousehold = new Household(householdName, 'household-id');

    mockUserRepository.createUserWithClient.mockResolvedValue(createdUser);
    mockHouseholdRepository.createWithClient.mockResolvedValue(createdHousehold);
    mockHouseholdRepository.addMemberWithClient.mockImplementation((client, member) => {
      expect(member).toBeInstanceOf(HouseholdMember);
      expect(member.householdId).toBe('household-id');
      expect(member.userId).toBe('user-id');
      expect(member.role).toBe('owner');
      expect(member.status).toBe('active');
      return Promise.resolve();
    });
    mockUserRepository.updateUserWithClient.mockResolvedValue(createdUser);

    await coordinator.createUserWithHousehold(user, householdName);

    expect(mockHouseholdRepository.addMemberWithClient).toHaveBeenCalled();
  });

  it('should rollback transaction on error during user creation', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';

    mockUserRepository.createUserWithClient.mockRejectedValue(new Error('DB Error'));

    await expect(coordinator.createUserWithHousehold(user, householdName)).rejects.toThrow(
      'Error creating user with household'
    );

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should rollback transaction on error during household creation', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';
    const createdUser = new User('test@example.com', 'Test User', 'auth123', 'user-id');

    mockUserRepository.createUserWithClient.mockResolvedValue(createdUser);
    mockHouseholdRepository.createWithClient.mockRejectedValue(new Error('DB Error'));

    await expect(coordinator.createUserWithHousehold(user, householdName)).rejects.toThrow(
      'Error creating user with household'
    );

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should rollback transaction on error during adding member to household', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';
    const createdUser = new User('test@example.com', 'Test User', 'auth123', 'user-id');
    const createdHousehold = new Household(householdName, 'household-id');

    mockUserRepository.createUserWithClient.mockResolvedValue(createdUser);
    mockHouseholdRepository.createWithClient.mockResolvedValue(createdHousehold);
    mockHouseholdRepository.addMemberWithClient.mockRejectedValue(new Error('DB Error'));

    await expect(coordinator.createUserWithHousehold(user, householdName)).rejects.toThrow(
      'Error creating user with household'
    );

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should rollback transaction on error during user update', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';
    const createdUser = new User('test@example.com', 'Test User', 'auth123', 'user-id');
    const createdHousehold = new Household(householdName, 'household-id');

    mockUserRepository.createUserWithClient.mockResolvedValue(createdUser);
    mockHouseholdRepository.createWithClient.mockResolvedValue(createdHousehold);
    mockHouseholdRepository.addMemberWithClient.mockResolvedValue();
    mockUserRepository.updateUserWithClient.mockRejectedValue(new Error('DB Error'));

    await expect(coordinator.createUserWithHousehold(user, householdName)).rejects.toThrow(
      'Error creating user with household'
    );

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should throw AppError with status 500 on any error', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';

    mockUserRepository.createUserWithClient.mockRejectedValue(new Error('Random Error'));

    await expect(coordinator.createUserWithHousehold(user, householdName)).rejects.toThrow(
      AppError
    );
    await expect(coordinator.createUserWithHousehold(user, householdName)).rejects.toMatchObject({
      message: 'Error creating user with household',
      statusCode: 500,
    });
  });

  it('should release client even if rollback fails', async () => {
    const user = new User('test@example.com', 'Test User', 'auth123');
    const householdName = 'Test Household';

    mockUserRepository.createUserWithClient.mockRejectedValue(new Error('DB Error'));
    let rollbackCalled = false;
    mockClient.query.mockImplementation((query) => {
      if (query === 'ROLLBACK') {
        rollbackCalled = true;
        return Promise.resolve(); // Simulate successful rollback
      }
      return Promise.resolve();
    });

    const result = await coordinator.createUserWithHousehold(user, householdName).catch((e) => e);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Error creating user with household');
    expect(result.statusCode).toBe(500);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(rollbackCalled).toBe(true);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
