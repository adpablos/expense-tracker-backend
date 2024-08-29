import 'reflect-metadata';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from "../../../../src/app";
import { DI_TYPES } from '../../../../src/types/di';
import { createTestContainer } from "../../../testContainer";
import { mockHouseholdService } from "../../mocks/serviceMocks";
import { mockUserId, mockHouseholdId } from '../../testUtils';
import { AppError } from '../../../../src/utils/AppError';
import { User } from '../../../../src/models/User';

jest.mock('pg', () => require('../../mocks/pg'));

jest.mock('../../../../middleware/authMiddleware', () => ({
    authMiddleware: jest.fn((req, res, next) => next()),
    attachUser: jest.fn((req, res, next) => {
        req.user = new User('test@example.com', 'Test User', 'auth0|123456');
        req.user.id = 'mockUserId';
        req.user.addHousehold = jest.fn();
        next();
    }),
}));

const testContainer = createTestContainer();
testContainer.rebind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
const app = createApp(testContainer);

describe('Household Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/households', () => {
        it('should create a new household', async () => {
            const newHousehold = {
                name: 'New Household'
            };

            const mockCreatedHousehold = {
                id: uuidv4(),
                name: 'New Household',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            (mockHouseholdService.createHousehold as jest.Mock).mockResolvedValue(mockCreatedHousehold);

            const response = await request(app)
                .post('/api/households')
                .send(newHousehold)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                id: expect.any(String),
                name: newHousehold.name,
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            });
        });

        it('should return 409 when a household with the same name already exists for the user', async () => {
            const existingHousehold = {
                name: 'Existing Household'
            };

            (mockHouseholdService.createHousehold as jest.Mock).mockRejectedValue(new AppError('Duplicate entry: User or Household already exists', 409));

            const response = await request(app)
                .post('/api/households')
                .send(existingHousehold)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(409);
            expect(response.body).toEqual({
                status: 'error',
                message: 'Duplicate entry: User or Household already exists'
            });
        });
    });

    describe('POST /api/households/{householdId}/invite', () => {
        it('should send an invitation to join a household', async () => {
            const householdId = uuidv4();
            const invitedUserId = uuidv4();

            (mockHouseholdService.inviteMember as jest.Mock).mockResolvedValue({ success: true });

            const response = await request(app)
                .post(`/api/households/${householdId}/invite`)
                .send({ invitedUserId })
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Invitation sent successfully');
        });

        it('should return 403 when the user is not the household owner', async () => {
            const householdId = uuidv4();
            const invitedUserId = uuidv4();

            (mockHouseholdService.inviteMember as jest.Mock).mockRejectedValue(new AppError('You do not have permission to invite members', 403));

            const response = await request(app)
                .post(`/api/households/${householdId}/invite`)
                .send({ invitedUserId })
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                status: 'error',
                message: 'You do not have permission to invite members'
            });
        });
    });

    describe('POST /api/households/{householdId}/accept', () => {
        it('should accept an invitation to join a household', async () => {
            const householdId = uuidv4();

            (mockHouseholdService.acceptInvitation as jest.Mock).mockResolvedValue({ success: true });

            const response = await request(app)
                .post(`/api/households/${householdId}/accept`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Invitation accepted successfully');
        });
    });

    describe('POST /api/households/{householdId}/reject', () => {
        it('should reject an invitation to join a household', async () => {
            const householdId = uuidv4();

            (mockHouseholdService.rejectInvitation as jest.Mock).mockResolvedValue({ success: true });

            const response = await request(app)
                .post(`/api/households/${householdId}/reject`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Invitation rejected successfully');
        });
    });

    describe('GET /api/households/{householdId}/members', () => {
        it('should retrieve all members of a household', async () => {
            const householdId = uuidv4();
            const mockMembers = [
                { id: uuidv4(), user_id: uuidv4(), role: 'owner', status: 'active' },
                { id: uuidv4(), user_id: uuidv4(), role: 'member', status: 'active' }
            ];

            (mockHouseholdService.getHouseholdMembers as jest.Mock).mockResolvedValue(mockMembers);

            const response = await request(app)
                .get(`/api/households/${householdId}/members`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('role', 'owner');
            expect(response.body[1]).toHaveProperty('role', 'member');
        });

        it('should return 403 when the user is not a member of the household', async () => {
            const householdId = uuidv4();

            (mockHouseholdService.getHouseholdMembers as jest.Mock).mockRejectedValue(new AppError('You do not have access to this household', 403));

            const response = await request(app)
                .get(`/api/households/${householdId}/members`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                status: 'error',
                message: 'You do not have access to this household'
            });
        });
    });

    describe('DELETE /api/households/{householdId}/members/{userId}', () => {
        it('should remove a member from a household', async () => {
            const householdId = uuidv4();
            const memberIdToRemove = uuidv4();

            (mockHouseholdService.removeMember as jest.Mock).mockResolvedValue({ success: true });

            const response = await request(app)
                .delete(`/api/households/${householdId}/members/${memberIdToRemove}`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Member removed successfully');
        });

        it('should return 403 when the user is not the household owner', async () => {
            const householdId = uuidv4();
            const memberIdToRemove = uuidv4();

            (mockHouseholdService.removeMember as jest.Mock).mockRejectedValue(new AppError('You do not have permission to remove members', 403));

            const response = await request(app)
                .delete(`/api/households/${householdId}/members/${memberIdToRemove}`)
                .set('Authorization', 'Bearer mockToken');

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                status: 'error',
                message: 'You do not have permission to remove members'
            });
        });
    });
});