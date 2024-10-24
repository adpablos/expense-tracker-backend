import 'reflect-metadata';
import { Pool, PoolClient } from 'pg';

import { DI_TYPES } from '../../../src/config/di';
import { Household } from '../../../src/models/Household';
import { HouseholdMember } from '../../../src/models/HouseholdMember';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { AppError } from '../../../src/utils/AppError';
import { createUnitTestContainer } from '../../config/testContainers';

describe('HouseholdRepository', () => {
  let householdRepository: HouseholdRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const container = createUnitTestContainer({ mockDbPool: true });
    mockPool = container.get<Pool>(DI_TYPES.DbPool) as jest.Mocked<Pool>;
    householdRepository = container.get<HouseholdRepository>(DI_TYPES.HouseholdRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new household successfully', async () => {
      const household = new Household('Test Household');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-id', name: 'Test Household' }] });

      const result = await householdRepository.create(household);

      expect(result).toBeInstanceOf(Household);
      expect(result.id).toBe('new-id');
      expect(result.name).toBe('Test Household');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO households'),
        expect.arrayContaining([expect.any(String), 'Test Household'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if household creation fails', async () => {
      const household = new Household('Test Household');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(householdRepository.create(household)).rejects.toThrow(AppError);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if household already exists', async () => {
      const household = new Household('Test Household');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      const error = new Error('Duplicate key value') as Error & { code?: string };
      error.code = '23505';
      mockClient.query.mockRejectedValueOnce(error);

      await expect(householdRepository.create(household)).rejects.toThrow(AppError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createWithClient', () => {
    it('should throw an AppError if database error occurs', async () => {
      const household = new Household('Test Household');
      const mockClient: jest.Mocked<PoolClient> = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      } as unknown as jest.Mocked<PoolClient>;

      await expect(householdRepository.createWithClient(mockClient, household)).rejects.toThrow(
        AppError
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO households (id, name) VALUES ($1, $2) RETURNING *',
        [household.id, household.name]
      );
    });

    it('should throw an error if no household is returned after creation', async () => {
      const household = new Household('Test Household');
      const mockClient: jest.Mocked<PoolClient> = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }), // No rows retornados
        release: jest.fn(),
      } as unknown as jest.Mocked<PoolClient>;

      await expect(householdRepository.createWithClient(mockClient, household)).rejects.toThrow(
        'Household could not be created'
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO households (id, name) VALUES ($1, $2) RETURNING *',
        [household.id, household.name]
      );
    });
  });

  describe('getById', () => {
    it('should return a household when it exists', async () => {
      const householdId = '123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: householdId, name: 'Test Household' }],
      });

      const result = await householdRepository.getHouseholdById(householdId);

      expect(result).toBeInstanceOf(Household);
      expect(result?.id).toBe(householdId);
      expect(result?.name).toBe('Test Household');
    });

    it('should return null when the household does not exist', async () => {
      const householdId = '123';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await householdRepository.getHouseholdById(householdId);

      expect(result).toBeNull();
    });
  });

  describe('isMember', () => {
    it('should return true when user is a member', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] });
      const result = await householdRepository.isMember('household1', 'user1');
      expect(result).toBe(true);
    });

    it('should return false when user is not a member', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await householdRepository.isMember('household1', 'user1');
      expect(result).toBe(false);
    });
  });

  describe('addMember', () => {
    it('should add a member successfully', async () => {
      const householdMember = new HouseholdMember('household-id', 'user-id', 'member', 'active');
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(householdRepository.addMember(householdMember)).resolves.not.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
        [
          householdMember.householdId,
          householdMember.userId,
          householdMember.role,
          householdMember.status,
        ]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an error if adding a member fails', async () => {
      const householdMember = new HouseholdMember('household-id', 'user-id', 'member', 'active');
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(householdRepository.addMember(householdMember)).rejects.toThrow(
        'Error adding member to household: Database error'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member status successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] });
      const result = await householdRepository.updateMemberStatus(
        'household1',
        'user1',
        'inactive'
      );
      expect(result).toBe(true);
    });

    it('should return false when member not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await householdRepository.updateMemberStatus(
        'household1',
        'user1',
        'inactive'
      );
      expect(result).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('should remove a member successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      const result = await householdRepository.removeMember('household1', 'user1');
      expect(result).toBe(true);
    });

    it('should return false when member not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      const result = await householdRepository.removeMember('household1', 'user1');
      expect(result).toBe(false);
    });
  });

  describe('getMembers', () => {
    it('should get members successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'member1',
            household_id: 'household1',
            user_id: 'user1',
            role: 'owner',
            status: 'active',
          },
          {
            id: 'member2',
            household_id: 'household1',
            user_id: 'user2',
            role: 'member',
            status: 'active',
          },
        ],
      });
      const result = await householdRepository.getMembers('household1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('member1');
      expect(result[1].id).toBe('member2');
    });
  });

  describe('getUserHouseholds', () => {
    it('should get user households successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { id: 'household1', name: 'Household 1' },
          { id: 'household2', name: 'Household 2' },
        ],
      });
      const result = await householdRepository.getUserHouseholds('user1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('household1');
      expect(result[1].id).toBe('household2');
    });
  });

  describe('getDefaultHouseholdForUser', () => {
    it('should get default household successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'household1', name: 'Default Household' }],
      });
      const result = await householdRepository.getDefaultHouseholdForUser('user1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('household1');
    });

    it('should return null when no household found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await householdRepository.getDefaultHouseholdForUser('user1');
      expect(result).toBeNull();
    });
  });

  describe('deleteOrphanedHousehold', () => {
    it('should delete orphaned household successfully', async () => {
      const householdId = 'household-1';
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(null) // BEGIN
          .mockResolvedValueOnce(null) // DELETE household_members
          .mockResolvedValueOnce(null) // DELETE households
          .mockResolvedValueOnce(null), // COMMIT
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(householdRepository.deleteOrphanedHousehold(householdId)).resolves.not.toThrow();

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        'DELETE FROM household_members WHERE household_id = $1',
        [householdId]
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'DELETE FROM households WHERE id = $1', [
        householdId,
      ]);
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw an AppError if transaction error occurs', async () => {
      const householdId = 'household-1';
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(null) // BEGIN
        .mockRejectedValueOnce(new Error('Delete error')); // Error in DELETE FROM household_members

      await expect(householdRepository.deleteOrphanedHousehold(householdId)).rejects.toThrow(
        AppError
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('transferHouseholdOwnership', () => {
    it('should transfer ownership successfully when another member exists', async () => {
      const householdId = 'household-1';
      const currentOwnerId = 'owner-1';
      const newOwnerId = 'user-2';

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(null) // BEGIN
          .mockResolvedValueOnce({ rows: [{ user_id: currentOwnerId }] }) // SELECT current owner
          .mockResolvedValueOnce({ rows: [{ user_id: newOwnerId }] }) // SELECT new owner
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }) // DELETE
          .mockResolvedValueOnce(null), // COMMIT
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        householdRepository.transferHouseholdOwnership(currentOwnerId, householdId)
      ).resolves.not.toThrow();

      expect(mockClient.query).toHaveBeenCalledTimes(6);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle case when no other member exists for ownership transfer', async () => {
      const householdId = 'household-1';
      const currentOwnerId = 'owner-1';

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(null) // BEGIN
          .mockResolvedValueOnce({ rows: [{ user_id: currentOwnerId }] }) // SELECT current owner
          .mockResolvedValueOnce({ rows: [] }) // SELECT new owner (empty)
          .mockResolvedValueOnce(null) // ROLLBACK
          .mockResolvedValueOnce(null), // Release (implícito)
        release: jest.fn(),
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        householdRepository.transferHouseholdOwnership(currentOwnerId, householdId)
      ).rejects.toThrow('No eligible member found to transfer ownership');

      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getMember', () => {
    it('should return a household member when it exists', async () => {
      const householdId = 'household-1';
      const userId = 'user-1';
      const mockMember = {
        id: 'member-1',
        household_id: householdId,
        user_id: userId,
        role: 'owner',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockMember],
      });

      const result = await householdRepository.getMember(householdId, userId);

      expect(result).toBeInstanceOf(HouseholdMember);
      expect(result?.householdId).toBe(householdId);
      expect(result?.userId).toBe(userId);
      expect(result?.role).toBe('owner');
      expect(result?.status).toBe('active');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, userId]
      );
    });

    it('should return null when the household member does not exist', async () => {
      const householdId = 'household-1';
      const userId = 'user-1';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await householdRepository.getMember(householdId, userId);

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, userId]
      );
    });

    it('should throw an AppError if there is a database error', async () => {
      const householdId = 'household-1';
      const userId = 'user-1';

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(householdRepository.getMember(householdId, userId)).rejects.toThrow(AppError);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, userId]
      );
    });
  });
});
