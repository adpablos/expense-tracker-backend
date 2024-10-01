import 'reflect-metadata';
import { Household } from '../../../src/models/Household';
import { HouseholdMember } from '../../../src/models/HouseholdMember';
import { User } from '../../../src/models/User';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { HouseholdService } from '../../../src/services/householdService';

jest.mock('../../../src/repositories/householdRepository');
jest.mock('../../../src/config/logger');

describe('HouseholdService', () => {
  let householdService: HouseholdService;
  let mockHouseholdRepository: jest.Mocked<HouseholdRepository>;

  beforeEach(() => {
    mockHouseholdRepository = {
      create: jest.fn(),
      getHouseholdById: jest.fn(),
      getById: jest.fn(),
      isMember: jest.fn(),
      addMember: jest.fn(),
      updateMemberStatus: jest.fn(),
      removeMember: jest.fn(),
      getMembers: jest.fn(),
      getUserHouseholds: jest.fn(),
      getDefaultHouseholdForUser: jest.fn(),
    } as unknown as jest.Mocked<HouseholdRepository>;

    householdService = new HouseholdService(mockHouseholdRepository);
  });

  describe('createHousehold', () => {
    it('should create a new household successfully', async () => {
      const household = new Household('Test Household');
      const user = new User('1', 'test@example.com', 'Test User', 'auth123');
      const createdHousehold = new Household('Test Household', 'new-household-id');

      mockHouseholdRepository.create.mockResolvedValue(createdHousehold);
      mockHouseholdRepository.addMember.mockResolvedValue();

      const result = await householdService.createHousehold(household, user);

      expect(result).toEqual(createdHousehold);
      expect(mockHouseholdRepository.create).toHaveBeenCalledWith(household);
      expect(mockHouseholdRepository.addMember).toHaveBeenCalled();
    });

    it('should throw an error if household creation fails', async () => {
      const household = new Household('Test Household');
      const user = new User('1', 'test@example.com', 'Test User', 'auth123');

      mockHouseholdRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(householdService.createHousehold(household, user)).rejects.toThrow(
        'Error creating household'
      );
    });
  });

  describe('getHouseholdById', () => {
    it('should return a household when it exists', async () => {
      const householdId = '123';
      const mockHousehold = new Household('Test Household', householdId);
      mockHouseholdRepository.getHouseholdById.mockResolvedValue(mockHousehold);

      const result = await householdService.getHouseholdById(householdId);

      expect(result).toEqual(mockHousehold);
    });

    it('should throw an error when the household does not exist', async () => {
      const householdId = '123';
      mockHouseholdRepository.getHouseholdById.mockResolvedValue(null);

      await expect(householdService.getHouseholdById(householdId)).rejects.toThrow(
        'Household not found'
      );
    });
  });

  describe('isMember', () => {
    it('should return true if the user is a member of the household', async () => {
      const householdId = '123';
      const userId = '456';
      mockHouseholdRepository.isMember.mockResolvedValue(true);

      const result = await householdService.isMember(householdId, userId);

      expect(result).toBe(true);
    });

    it('should return false if the user is not a member of the household', async () => {
      const householdId = '123';
      const userId = '456';
      mockHouseholdRepository.isMember.mockResolvedValue(false);

      const result = await householdService.isMember(householdId, userId);

      expect(result).toBe(false);
    });
  });

  describe('inviteMember', () => {
    it('should invite a member successfully', async () => {
      const householdId = '123';
      const invitedUserId = '456';
      const inviterId = '789';

      mockHouseholdRepository.isMember.mockResolvedValueOnce(true);
      mockHouseholdRepository.isMember.mockResolvedValueOnce(false);
      mockHouseholdRepository.addMember.mockResolvedValue();

      await expect(
        householdService.inviteMember(householdId, invitedUserId, inviterId)
      ).resolves.not.toThrow();
    });

    it('should throw an error if inviter is not a member', async () => {
      const householdId = '123';
      const invitedUserId = '456';
      const inviterId = '789';

      mockHouseholdRepository.isMember.mockResolvedValue(false);

      await expect(
        householdService.inviteMember(householdId, invitedUserId, inviterId)
      ).rejects.toThrow('You are not a member of this household');
    });
  });

  describe('acceptInvitation', () => {
    it('should accept an invitation successfully', async () => {
      const householdId = '123';
      const userId = '456';

      mockHouseholdRepository.updateMemberStatus.mockResolvedValue(true);

      await expect(householdService.acceptInvitation(householdId, userId)).resolves.not.toThrow();
    });

    it('should throw an error if no valid invitation found', async () => {
      const householdId = '123';
      const userId = '456';

      mockHouseholdRepository.updateMemberStatus.mockResolvedValue(false);

      await expect(householdService.acceptInvitation(householdId, userId)).rejects.toThrow(
        'No valid invitation found'
      );
    });
  });

  describe('rejectInvitation', () => {
    it('should reject an invitation successfully', async () => {
      const householdId = '123';
      const userId = '456';

      mockHouseholdRepository.removeMember.mockResolvedValue(true);

      await expect(householdService.rejectInvitation(householdId, userId)).resolves.not.toThrow();
    });

    it('should throw an error if no valid invitation found', async () => {
      const householdId = '123';
      const userId = '456';

      mockHouseholdRepository.removeMember.mockResolvedValue(false);

      await expect(householdService.rejectInvitation(householdId, userId)).rejects.toThrow(
        'No valid invitation found'
      );
    });
  });

  describe('getHouseholdMembers', () => {
    it('should get household members successfully', async () => {
      const householdId = '123e4567-e89b-12d3-a456-426614174000';
      const mockMembers = [
        new HouseholdMember(householdId, 'user1', 'owner', 'active'),
        new HouseholdMember(householdId, 'user2', 'member', 'active'),
      ];

      mockHouseholdRepository.getHouseholdById.mockResolvedValue(
        new Household('Test Household', householdId)
      );
      mockHouseholdRepository.getMembers.mockResolvedValue(mockMembers);

      const result = await householdService.getHouseholdMembers(householdId);

      expect(result).toEqual(mockMembers);
    });

    it('should throw an error if household does not exist', async () => {
      const householdId = '123e4567-e89b-12d3-a456-426614174000';

      mockHouseholdRepository.getHouseholdById.mockResolvedValue(null);

      await expect(householdService.getHouseholdMembers(householdId)).rejects.toThrow(
        'Household not found'
      );
    });
  });

  describe('removeMember', () => {
    it('should remove a member successfully', async () => {
      const householdId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '456';
      const removerId = '789';

      mockHouseholdRepository.getMembers.mockResolvedValue([
        new HouseholdMember(householdId, removerId, 'owner', 'active'),
      ]);
      mockHouseholdRepository.removeMember.mockResolvedValue(true);

      await expect(
        householdService.removeMember(householdId, userId, removerId)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the remover is not the owner', async () => {
      const householdId = '123';
      const userId = '456';
      const removerId = '789';

      mockHouseholdRepository.getMembers.mockResolvedValue([
        new HouseholdMember(householdId, removerId, 'member', 'active'),
      ]);

      await expect(householdService.removeMember(householdId, userId, removerId)).rejects.toThrow(
        'You do not have permission to remove members'
      );
    });
  });

  describe('getUserHouseholds', () => {
    it('should get user households successfully', async () => {
      const userId = '123';
      const mockHouseholds = [new Household('Household 1', '1'), new Household('Household 2', '2')];

      mockHouseholdRepository.getUserHouseholds.mockResolvedValue(mockHouseholds);

      const result = await householdService.getUserHouseholds(userId);

      expect(result).toEqual(mockHouseholds);
    });
  });

  describe('userHasAccessToHousehold', () => {
    it('should return true if the user has access to the household', async () => {
      const userId = '123';
      const householdId = '456';

      mockHouseholdRepository.isMember.mockResolvedValue(true);

      const result = await householdService.userHasAccessToHousehold(userId, householdId);

      expect(result).toBe(true);
    });

    it('should return false if the user does not have access to the household', async () => {
      const userId = '123';
      const householdId = '456';

      mockHouseholdRepository.isMember.mockResolvedValue(false);

      const result = await householdService.userHasAccessToHousehold(userId, householdId);

      expect(result).toBe(false);
    });
  });

  describe('getDefaultHouseholdForUser', () => {
    it('should get the default household for a user', async () => {
      const userId = '123';
      const mockHousehold = new Household('Default Household', '1');

      mockHouseholdRepository.getDefaultHouseholdForUser.mockResolvedValue(mockHousehold);

      const result = await householdService.getDefaultHouseholdForUser(userId);

      expect(result).toEqual(mockHousehold);
    });

    it('should return null if the user has no households', async () => {
      const userId = '123';

      mockHouseholdRepository.getDefaultHouseholdForUser.mockResolvedValue(null);

      const result = await householdService.getDefaultHouseholdForUser(userId);

      expect(result).toBeNull();
    });
  });
});
