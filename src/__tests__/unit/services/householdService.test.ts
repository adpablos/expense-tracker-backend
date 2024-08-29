import { Pool, QueryResult } from 'pg';
import { HouseholdService } from '../../../services/householdService';
import { Household } from '../../../models/Household';
import { User } from '../../../models/User';
import { HouseholdMember } from '../../../models/HouseholdMember';

jest.mock('pg');
jest.mock('../../../config/logger');

describe('HouseholdService', () => {
    let householdService: HouseholdService;
    let mockPool: jest.Mocked<Pool>;
    let mockClient: any;

    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        };
        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
            query: jest.fn(),
        } as unknown as jest.Mocked<Pool>;

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        householdService = new HouseholdService(mockPool);
    });

    describe('createHousehold', () => {
        it('should create a new household successfully', async () => {
            const household = new Household('Test Household');
            const user = new User('1', 'test@example.com', 'Test User', 'auth123');
            
            mockClient.query
                .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN transaction
                .mockResolvedValueOnce({ rows: [] }) // Usuario no existe
                .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // Insertar usuario
                .mockResolvedValueOnce({ rows: [{ id: 'new-household-id', name: 'Test Household' }] }) // Insertar household
                .mockResolvedValueOnce({ rows: [{ id: 'member-id' }] }) // Insertar household_member
                .mockResolvedValueOnce({ rowCount: 0 }); // COMMIT transaction

            const result = await householdService.createHousehold(household, user);

            expect(result).toBeInstanceOf(Household);
            expect(result.id).toBe('new-household-id');
            expect(result.name).toBe('Test Household');
            expect(mockClient.query).toHaveBeenCalledTimes(6);
        });

        it('should throw an error if user already exists', async () => {
            const household = new Household('Test Household');
            const user = new User('1', 'test@example.com', 'Test User', 'auth123');
            
            mockClient.query
                .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN transaction
                .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // Usuario ya existe
                .mockResolvedValueOnce({ rowCount: 0 }); // ROLLBACK transaction

            await expect(householdService.createHousehold(household, user))
                .rejects.toThrow('User already exists');
            
            expect(mockClient.query).toHaveBeenCalledTimes(3);
        });
    });

    describe('getHouseholdById', () => {
        it('should return a household when it exists', async () => {
            const householdId = '123';
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: householdId, name: 'Test Household' }] });

            const result = await householdService.getHouseholdById(householdId);

            expect(result).toBeInstanceOf(Household);
            expect(result.id).toBe(householdId);
            expect(result.name).toBe('Test Household');
        });

        it('should throw an error when the household does not exist', async () => {
            const householdId = '123';
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            await expect(householdService.getHouseholdById(householdId))
                .rejects.toThrow('Household not found');
        });
    });

    describe('isMember', () => {
        it('should return true if the user is a member of the household', async () => {
            const householdId = '123';
            const userId = '456';
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] });

            const result = await householdService.isMember(householdId, userId);

            expect(result).toBe(true);
        });

        it('should return false if the user is not a member of the household', async () => {
            const householdId = '123';
            const userId = '456';
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.isMember(householdId, userId);

            expect(result).toBe(false);
        });
    });

    describe('inviteMember', () => {
        it('should invite a member successfully', async () => {
            const householdId = '123';
            const invitedUserId = '456';
            const inviterId = '789';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] }); // isMember check
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // existingMember check
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '2' }] }); // insert new member

            await expect(householdService.inviteMember(householdId, invitedUserId, inviterId)).resolves.not.toThrow();
        });

        it('should throw an error if the inviter is not a member', async () => {
            const householdId = '123';
            const invitedUserId = '456';
            const inviterId = '789';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // isMember check

            await expect(householdService.inviteMember(householdId, invitedUserId, inviterId))
                .rejects.toThrow('You are not a member of this household');
        });
    });

    describe('acceptInvitation', () => {
        it('should accept an invitation successfully', async () => {
            const householdId = '123';
            const userId = '456';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] });

            await expect(householdService.acceptInvitation(householdId, userId)).resolves.not.toThrow();
        });

        it('should throw an error if no valid invitation is found', async () => {
            const householdId = '123';
            const userId = '456';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            await expect(householdService.acceptInvitation(householdId, userId))
                .rejects.toThrow('No valid invitation found');
        });
    });

    describe('rejectInvitation', () => {
        it('should reject an invitation successfully', async () => {
            const householdId = '123';
            const userId = '456';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            await expect(householdService.rejectInvitation(householdId, userId)).resolves.not.toThrow();
        });

        it('should throw an error if no valid invitation is found', async () => {
            const householdId = '123';
            const userId = '456';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

            await expect(householdService.rejectInvitation(householdId, userId))
                .rejects.toThrow('No valid invitation found');
        });
    });

    describe('getHouseholdMembers', () => {
        it('should get household members successfully', async () => {
            const householdId = '123e4567-e89b-12d3-a456-426614174000';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] }); // householdExists check
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1', user_id: '456', role: 'owner' }] });

            const result = await householdService.getHouseholdMembers(householdId);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(HouseholdMember);
        });

        it('should throw an error if the household does not exist', async () => {
            const householdId = '123e4567-e89b-12d3-a456-426614174000';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // householdExists check

            await expect(householdService.getHouseholdMembers(householdId))
                .rejects.toThrow('Household not found');
        });
    });

    describe('removeMember', () => {
        it('should remove a member successfully', async () => {
            const householdId = '123';
            const userId = '456';
            const removerId = '789';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }] }); // remover check
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }); // delete member

            await expect(householdService.removeMember(householdId, userId, removerId)).resolves.not.toThrow();
        });

        it('should throw an error if the remover is not the owner', async () => {
            const householdId = '123';
            const userId = '456';
            const removerId = '789';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // remover check

            await expect(householdService.removeMember(householdId, userId, removerId))
                .rejects.toThrow('You do not have permission to remove members');
        });
    });

    describe('getUserHouseholds', () => {
        it('should get user households successfully', async () => {
            const userId = '123';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1', name: 'Household 1' }, { id: '2', name: 'Household 2' }] });

            const result = await householdService.getUserHouseholds(userId);

            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(Household);
            expect(result[1]).toBeInstanceOf(Household);
        });
    });

    describe('userHasAccessToHousehold', () => {
        it('should return true if the user has access to the household', async () => {
            const userId = '123';
            const householdId = '456';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] });

            const result = await householdService.userHasAccessToHousehold(userId, householdId);

            expect(result).toBe(true);
        });

        it('should return false if the user does not have access to the household', async () => {
            const userId = '123';
            const householdId = '456';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.userHasAccessToHousehold(userId, householdId);

            expect(result).toBe(false);
        });
    });

    describe('getDefaultHouseholdForUser', () => {
        it('should get the default household for a user', async () => {
            const userId = '123';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1', name: 'Default Household' }] });

            const result = await householdService.getDefaultHouseholdForUser(userId);

            expect(result).toBeInstanceOf(Household);
            expect(result?.name).toBe('Default Household');
        });

        it('should return null if the user has no households', async () => {
            const userId = '123';

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.getDefaultHouseholdForUser(userId);

            expect(result).toBeNull();
        });
    });
});