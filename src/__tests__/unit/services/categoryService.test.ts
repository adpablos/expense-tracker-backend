import { CategoryService } from '../../../services/categoryService';
import { Category } from '../../../models/Category';
import { Pool } from 'pg';
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

describe('CategoryService', () => {
    let categoryService: CategoryService;
    let mockPool: jest.Mocked<Pool>;
    let mockNotificationService: jest.Mocked<NotificationService>;

    beforeEach(() => {
        mockPool = {
            query: jest.fn(),
        } as unknown as jest.Mocked<Pool>;
        mockNotificationService = {
            notifyHouseholdMembers: jest.fn(),
        } as unknown as jest.Mocked<NotificationService>;
        categoryService = new CategoryService(mockPool);
        (categoryService as any).notificationService = mockNotificationService;
    });

    it('should get all categories for a household', async () => {
        const householdId = uuidv4();
        const mockCategories = [
            { id: uuidv4(), name: 'Category 1', household_id: householdId },
            { id: uuidv4(), name: 'Category 2', household_id: householdId },
        ];

        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockCategories });

        const result = await categoryService.getAllCategories(householdId);

        expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT * FROM categories WHERE household_id = $1',
            [householdId]
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Category);
        expect(result[1]).toBeInstanceOf(Category);
    });

    it('should create a new category', async () => {
        const newCategory = new Category('New Category', uuidv4());
        const mockDbResult = { ...newCategory.toDatabase(), id: uuidv4() };

        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDbResult] });

        const result = await categoryService.createCategory(newCategory);

        expect(mockPool.query).toHaveBeenCalledWith(
            'INSERT INTO categories (id, name, household_id) VALUES ($1, $2, $3) RETURNING *',
            [newCategory.id, newCategory.name, newCategory.householdId]
        );
        expect(result).toBeInstanceOf(Category);
        expect(result.name).toBe(newCategory.name);
        expect(result.householdId).toBe(newCategory.householdId);
        expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
            newCategory.householdId,
            expect.stringContaining('Nueva categoría creada:')
        );
    });

    it('should update an existing category', async () => {
        const categoryId = uuidv4();
        const householdId = uuidv4();
        const updatedName = 'Updated Category';
        const mockUpdatedCategory = { id: categoryId, name: updatedName, household_id: householdId };

        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedCategory] });

        const result = await categoryService.updateCategory(categoryId, updatedName, householdId);

        expect(mockPool.query).toHaveBeenCalledWith(
            'UPDATE categories SET name = $1 WHERE id = $2 AND household_id = $3 RETURNING *',
            [updatedName, categoryId, householdId]
        );
        expect(result).toBeInstanceOf(Category);
        expect(result?.name).toBe(updatedName);
        expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
            householdId,
            expect.stringContaining('Categoría actualizada:')
        );
    });

    it('should delete a category', async () => {
        const categoryId = uuidv4();
        const householdId = uuidv4();

        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

        const result = await categoryService.deleteCategory(categoryId, householdId);

        expect(mockPool.query).toHaveBeenCalledWith(
            'DELETE FROM categories WHERE id = $1 AND household_id = $2',
            [categoryId, householdId]
        );
        expect(result).toBe(1);
        expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
            householdId,
            expect.stringContaining('Categoría eliminada:')
        );
    });

    it('should handle errors when deleting a category with subcategories', async () => {
        const categoryId = uuidv4();
        const householdId = uuidv4();

        const error = new Error('violates foreign key constraint') as any;
        error.code = '23503';
        (mockPool.query as jest.Mock).mockRejectedValueOnce(error);

        await expect(categoryService.deleteCategory(categoryId, householdId)).rejects.toThrow(
            'Cannot delete category with associated subcategories. Use force=true to force deletion.'
        );
    });

    it('should delete subcategories by category ID', async () => {
        const categoryId = uuidv4();
        const householdId = uuidv4();

        (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2 });

        const result = await categoryService.deleteSubcategoriesByCategoryId(categoryId, householdId);

        expect(mockPool.query).toHaveBeenCalledWith(
            'DELETE FROM subcategories WHERE category_id = $1 AND household_id = $2',
            [categoryId, householdId]
        );
        expect(result).toBe(2);
    });

    it('should handle database errors', async () => {
        const householdId = uuidv4();
        (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

        await expect(categoryService.getAllCategories(householdId)).rejects.toThrow(AppError);
    });
});