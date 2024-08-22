import { HouseholdService } from '../../../services/householdService';
import { Household } from '../../../models/Household';
import { User } from '../../../models/User';
import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../utils/AppError';
import {createMockQueryResult} from "../e2e/api.test";

jest.mock('pg');
jest.mock('../../../config/logger');
jest.mock('../../../config/openaiConfig', () => ({
    __esModule: true,
    default: {
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Mocked response' } }]
                })
            }
        },
        audio: {
            transcriptions: {
                create: jest.fn().mockResolvedValue({ text: 'Mocked transcription' })
            }
        }
    }
}));

describe('HouseholdService', () => {
    let householdService: HouseholdService;
    let mockPool: jest.Mocked<Pool>;
    let mockClient: jest.Mocked<PoolClient>;

    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        } as unknown as jest.Mocked<PoolClient>;

        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
            query: jest.fn(),
        } as unknown as jest.Mocked<Pool>;

        householdService = new HouseholdService(mockPool);
    });

    describe('createHousehold', () => {
        it('should create a new household', async () => {
            const newHousehold = new Household('Test Household');
            const user = new User('test@example.com', 'Test User', 'auth0|123456');
            const mockDbResult = { ...newHousehold.toDatabase(), id: uuidv4() };

            (mockClient.query as jest.Mock).mockResolvedValueOnce(createMockQueryResult([]));
            (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: user.id }] }); // Insert user
            (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDbResult] }); // Insert household
            (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }); // Insert household member

            const result = await householdService.createHousehold(newHousehold, user);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(result).toBeInstanceOf(Household);
            expect(result.name).toBe(newHousehold.name);
        });

        it('should throw an error if user already exists', async () => {
            const newHousehold = new Household('Test Household');
            const user = new User('test@example.com', 'Test User', 'auth0|123456');

            (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: user.id }] }); // User already exists

            await expect(householdService.createHousehold(newHousehold, user)).rejects.toThrow(AppError);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });
    });

    describe('getHouseholdById', () => {
        it('should return a household by id', async () => {
            const householdId = uuidv4();
            const mockHousehold = { id: householdId, name: 'Test Household', created_at: new Date(), updated_at: new Date() };

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockHousehold] });

            const result = await householdService.getHouseholdById(householdId);

            expect(result).toBeInstanceOf(Household);
            expect(result?.id).toBe(householdId);
        });

        it('should return null if household not found', async () => {
            const householdId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.getHouseholdById(householdId);

            expect(result).toBeNull();
        });
    });

    describe('isMember', () => {
        it('should return true if user is a member of the household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

            const result = await householdService.isMember(householdId, userId);

            expect(result).toBe(true);
        });

        it('should return false if user is not a member of the household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.isMember(householdId, userId);

            expect(result).toBe(false);
        });
    });

    // Add more tests for other methods like inviteMember, acceptInvitation, rejectInvitation, etc.

    describe('getUserHouseholds', () => {
        it('should return all households for a user', async () => {
            const userId = uuidv4();
            const mockHouseholds = [
                { id: uuidv4(), name: 'Household 1', created_at: new Date(), updated_at: new Date() },
                { id: uuidv4(), name: 'Household 2', created_at: new Date(), updated_at: new Date() },
            ];

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockHouseholds });

            const result = await householdService.getUserHouseholds(userId);

            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(Household);
            expect(result[1]).toBeInstanceOf(Household);
        });
    });

    describe('userHasAccessToHousehold', () => {
        it('should return true if user has access to the household', async () => {
            const userId = uuidv4();
            const householdId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

            const result = await householdService.userHasAccessToHousehold(userId, householdId);

            expect(result).toBe(true);
        });

        it('should return false if user does not have access to the household', async () => {
            const userId = uuidv4();
            const householdId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.userHasAccessToHousehold(userId, householdId);

            expect(result).toBe(false);
        });
    });

    describe('getDefaultHouseholdForUser', () => {
        it('should return the default household for a user', async () => {
            const userId = uuidv4();
            const mockHousehold = { id: uuidv4(), name: 'Default Household', created_at: new Date(), updated_at: new Date() };

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockHousehold] });

            const result = await householdService.getDefaultHouseholdForUser(userId);

            expect(result).toBeInstanceOf(Household);
            expect(result?.name).toBe('Default Household');
        });

        it('should return null if user has no households', async () => {
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            const result = await householdService.getDefaultHouseholdForUser(userId);

            expect(result).toBeNull();
        });
    });

    describe('inviteMember', () => {
        it('should invite a member to a household', async () => {
            const householdId = uuidv4();
            const invitedUserId = uuidv4();
            const inviterId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: inviterId }] }); // Check if inviter is a member
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Check if invited user is already a member
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] }); // Insert household member

            await householdService.inviteMember(householdId, invitedUserId, inviterId);

            expect(mockPool.query).toHaveBeenCalledTimes(3);
        });

        it('should throw an error if inviter is not a member', async () => {
            const householdId = uuidv4();
            const invitedUserId = uuidv4();
            const inviterId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Inviter is not a member

            await expect(householdService.inviteMember(householdId, invitedUserId, inviterId))
                .rejects.toThrow('You are not a member of this household');
        });

        it('should throw an error if invited user is already a member', async () => {
            const householdId = uuidv4();
            const invitedUserId = uuidv4();
            const inviterId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: inviterId }] }); // Check if inviter is a member
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: invitedUserId }] }); // Invited user is already a member

            await expect(householdService.inviteMember(householdId, invitedUserId, inviterId))
                .rejects.toThrow('User is already a member or invited to this household');
        });
    });

    describe('acceptInvitation', () => {
        it('should accept an invitation to a household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

            await householdService.acceptInvitation(householdId, userId);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE household_members SET status = $1'),
                ['active', householdId, userId, 'invited']
            );
        });

        it('should throw an error if no valid invitation is found', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            await expect(householdService.acceptInvitation(householdId, userId))
                .rejects.toThrow('No valid invitation found');
        });
    });

    describe('rejectInvitation', () => {
        it('should reject an invitation to a household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            await householdService.rejectInvitation(householdId, userId);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM household_members'),
                [householdId, userId, 'invited']
            );
        });

        it('should throw an error if no valid invitation is found', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

            await expect(householdService.rejectInvitation(householdId, userId))
                .rejects.toThrow('No valid invitation found');
        });
    });

    describe('getHouseholdMembers', () => {
        it('should return all members of a household', async () => {
            const householdId = uuidv4();
            const mockMembers = [
                { id: uuidv4(), household_id: householdId, user_id: uuidv4(), role: 'owner', status: 'active' },
                { id: uuidv4(), household_id: householdId, user_id: uuidv4(), role: 'member', status: 'active' },
            ];

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ exists: true }] }); // Check if household exists
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockMembers });

            const result = await householdService.getHouseholdMembers(householdId);

            expect(result).toHaveLength(2);
            expect(result[0].role).toBe('owner');
            expect(result[1].role).toBe('member');
        });

        it('should throw an error if household does not exist', async () => {
            const householdId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ exists: false }] });

            await expect(householdService.getHouseholdMembers(householdId))
                .rejects.toThrow('Error fetching household members');
        });
    });

    describe('removeMember', () => {
        it('should remove a member from a household', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();
            const removerId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }] }); // Check remover's role
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 }); // Remove member

            await householdService.removeMember(householdId, userId, removerId);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });

        it('should throw an error if remover is not the owner', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();
            const removerId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'member' }] });

            await expect(householdService.removeMember(householdId, userId, removerId))
                .rejects.toThrow('You do not have permission to remove members');
        });

        it('should throw an error if trying to remove non-existent member or self', async () => {
            const householdId = uuidv4();
            const userId = uuidv4();
            const removerId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }] });
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

            await expect(householdService.removeMember(householdId, userId, removerId))
                .rejects.toThrow('Member not found or cannot remove yourself');
        });
    });
});