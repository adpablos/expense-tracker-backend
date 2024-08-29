import { SubcategoryService } from '../../../services/subcategoryService';
import { Subcategory } from '../../../models/Subcategory';
import { Pool, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../utils/AppError';
import { NotificationService } from '../../../services/external/notificationService';

jest.mock('pg');
jest.mock('../../../config/logger');
jest.mock('../../../services/external/notificationService');
jest.mock('../../../config/db', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        connect: jest.fn().mockResolvedValue({
            query: jest.fn(),
            release: jest.fn(),
        }),
    },
}));

describe('SubcategoryService', () => {
    let subcategoryService: SubcategoryService;
    let mockPool: jest.Mocked<Pool>;
    let mockNotificationService: jest.Mocked<NotificationService>;

    beforeEach(() => {
        mockPool = {
            query: jest.fn(),
        } as unknown as jest.Mocked<Pool>;
        mockNotificationService = {
            notifyHouseholdMembers: jest.fn(),
        } as unknown as jest.Mocked<NotificationService>;
        subcategoryService = new SubcategoryService(mockPool);
        (subcategoryService as any).notificationService = mockNotificationService;
    });

    describe('getAllSubcategories', () => {
        it('should return all subcategories for a household', async () => {
            const householdId = uuidv4();
            const mockSubcategories = [
                { id: uuidv4(), name: 'Subcategory 1', category_id: uuidv4(), household_id: householdId },
                { id: uuidv4(), name: 'Subcategory 2', category_id: uuidv4(), household_id: householdId },
            ];

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockSubcategories });

            const result = await subcategoryService.getAllSubcategories(householdId);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT * FROM subcategories WHERE household_id = $1',
                [householdId]
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(Subcategory);
            expect(result[1]).toBeInstanceOf(Subcategory);
        });
    });

    describe('createSubcategory', () => {
        it('should create a new subcategory', async () => {
            const newSubcategory = new Subcategory('New Subcategory', uuidv4(), uuidv4());
            const mockDbResult = { ...newSubcategory.toDatabase(), id: uuidv4() };

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDbResult] });

            const result = await subcategoryService.createSubcategory(newSubcategory);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/INSERT INTO subcategories .+ VALUES .+ RETURNING \*/),
                expect.arrayContaining([
                    newSubcategory.id,
                    newSubcategory.name,
                    newSubcategory.categoryId,
                    newSubcategory.householdId
                ])
            );
            expect(result).toBeInstanceOf(Subcategory);
            expect(result.name).toBe(newSubcategory.name);
            expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
                newSubcategory.householdId,
                expect.stringContaining('Nueva subcategoría creada:')
            );
        });

        it('should throw an error for invalid subcategory data', async () => {
            const invalidSubcategory = new Subcategory('', '', ''); // Invalid: empty name and IDs

            await expect(subcategoryService.createSubcategory(invalidSubcategory))
                .rejects
                .toThrow(AppError);
        });
    });

    describe('updateSubcategory', () => {
        it('should update an existing subcategory', async () => {
            const subcategoryId = uuidv4();
            const categoryId = uuidv4();
            const householdId = uuidv4();
            const updatedName = 'Updated Subcategory';
            const mockUpdatedSubcategory = { id: subcategoryId, name: updatedName, category_id: categoryId, household_id: householdId };

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedSubcategory] });

            const result = await subcategoryService.updateSubcategory(subcategoryId, updatedName, categoryId, householdId);

            expect(mockPool.query).toHaveBeenCalledWith(
                'UPDATE subcategories SET name = $1, category_id = $2 WHERE id = $3 AND household_id = $4 RETURNING *',
                [updatedName, categoryId, subcategoryId, householdId]
            );
            expect(result).toBeInstanceOf(Subcategory);
            expect(result?.name).toBe(updatedName);
            expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
                householdId,
                expect.stringContaining('Subcategoría actualizada:')
            );
        });

        it('should throw AppError when updating non-existent subcategory', async () => {
            const subcategoryId = uuidv4();
            const categoryId = uuidv4();
            const householdId = uuidv4();
            const updatedName = 'Updated Subcategory';

            const mockQueryResult: QueryResult = {
                rows: [],
                command: '',
                rowCount: 0,
                oid: 0,
                fields: []
            };

            (mockPool.query as jest.Mock).mockResolvedValueOnce(mockQueryResult);

            const updatePromise = subcategoryService.updateSubcategory(subcategoryId, updatedName, categoryId, householdId);

            await expect(updatePromise).rejects.toThrow(AppError);
            await expect(updatePromise).rejects.toThrow('Subcategory not found');
        });
    });

    describe('deleteSubcategory', () => {
        it('should delete an existing subcategory', async () => {
            const subcategoryId = uuidv4();
            const householdId = uuidv4();

            const mockQueryResult: QueryResult = {
                rows: [],
                command: 'DELETE',
                rowCount: 1,
                oid: 0,
                fields: []
            };

            (mockPool.query as jest.Mock).mockResolvedValueOnce(mockQueryResult);

            await expect(subcategoryService.deleteSubcategory(subcategoryId, householdId))
                .resolves.not.toThrow();

            expect(mockPool.query).toHaveBeenCalledWith(
                'DELETE FROM subcategories WHERE id = $1 AND household_id = $2',
                [subcategoryId, householdId]
            );
            expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
                householdId,
                expect.stringContaining('Subcategoría eliminada:')
            );
        });

        it('should throw AppError when deleting non-existent subcategory', async () => {
            const subcategoryId = uuidv4();
            const householdId = uuidv4();

            const mockQueryResult: QueryResult = {
                rows: [],
                command: 'DELETE',
                rowCount: 0,
                oid: 0,
                fields: []
            };

            (mockPool.query as jest.Mock).mockResolvedValueOnce(mockQueryResult);

            const result = subcategoryService.deleteSubcategory(subcategoryId, householdId);

            await expect(result)
                .rejects.toThrow(AppError);
            await expect(result)
                .rejects.toThrow('Subcategory not found');
        });
    });

    describe('Error handling', () => {
        it('should throw AppError on database errors', async () => {
            const householdId = uuidv4();

            (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

            await expect(subcategoryService.getAllSubcategories(householdId))
                .rejects
                .toThrow(AppError);
        });
    });
});