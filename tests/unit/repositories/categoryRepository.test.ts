import { Pool } from 'pg';

import { Category } from '../../../src/models/Category';
import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { DI_TYPES } from '../../../src/types/di';
import { AppError } from '../../../src/utils/AppError';
import { createRepositoryTestContainer } from '../../testContainer';

describe('CategoryRepository', () => {
  let categoryRepository: CategoryRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const container = createRepositoryTestContainer();
    mockPool = container.get<Pool>(DI_TYPES.Pool) as jest.Mocked<Pool>;
    categoryRepository = container.get<CategoryRepository>(DI_TYPES.CategoryRepository);
    jest.clearAllMocks();
  });

  describe('getCategoryById', () => {
    it('should return a category when found', async () => {
      const categoryId = 'category-id';
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
        household_id: 'household-id',
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCategory] });

      const result = await categoryRepository.getCategoryById(categoryId);

      expect(result).toBeInstanceOf(Category);
      expect(result?.id).toBe(categoryId);
      expect(result?.name).toBe('Test Category');
      expect(result?.householdId).toBe('household-id');
    });

    it('should return null when the category is not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await categoryRepository.getCategoryById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw an error if the query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(categoryRepository.getCategoryById('category-id')).rejects.toThrow(AppError);
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories for a household', async () => {
      const householdId = 'household-id';
      const mockCategories = [
        { id: 'cat1', name: 'Category 1', household_id: householdId },
        { id: 'cat2', name: 'Category 2', household_id: householdId },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockCategories });

      const result = await categoryRepository.getAllCategories(householdId);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Category);
      expect(result[0].id).toBe('cat1');
      expect(result[1].id).toBe('cat2');
    });

    it('should throw an error if the query fails', async () => {
      const householdId = 'household-id';
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(categoryRepository.getAllCategories(householdId)).rejects.toThrow(AppError);
    });
  });

  describe('createCategory', () => {
    it('should create a new category successfully', async () => {
      const category = new Category('Test Category', 'household-id');
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'new-id', name: 'Test Category', household_id: 'household-id' }],
      });

      const result = await categoryRepository.createCategory(category);

      expect(result).toBeInstanceOf(Category);
      expect(result.id).toBe('new-id');
      expect(result.name).toBe('Test Category');
      expect(result.householdId).toBe('household-id');
    });

    it('should handle errors when creating a category', async () => {
      const category = new Category('Test Category', 'household-id');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(categoryRepository.createCategory(category)).rejects.toThrow(AppError);
    });
  });

  describe('updateCategory', () => {
    it('should update a category successfully', async () => {
      const categoryId = 'category-id';
      const newName = 'Updated Category';
      const householdId = 'household-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: categoryId, name: newName, household_id: householdId }],
      });

      const result = await categoryRepository.updateCategory(categoryId, newName, householdId);

      expect(result).toBeInstanceOf(Category);
      expect(result.id).toBe(categoryId);
      expect(result.name).toBe(newName);
      expect(result.householdId).toBe(householdId);
    });

    it('should throw an error if the category is not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        categoryRepository.updateCategory('non-existent-id', 'New Name', 'household-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      await expect(
        categoryRepository.deleteCategory('category-id', 'household-id')
      ).resolves.not.toThrow();
    });

    it('should throw an error if the category is not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      await expect(
        categoryRepository.deleteCategory('non-existent-id', 'household-id')
      ).rejects.toThrow(AppError);
    });

    it('should handle the case of not being able to delete a category with associated subcategories', async () => {
      const error = new Error('Foreign key constraint') as Error & { code?: string };
      error.code = '23503';
      (mockPool.query as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        categoryRepository.deleteCategory('category-id', 'household-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteSubcategoriesByCategoryId', () => {
    it('should delete all subcategories of a given category', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2 });

      await expect(
        categoryRepository.deleteSubcategoriesByCategoryId('category-id', 'household-id')
      ).resolves.not.toThrow();
    });

    it('should handle errors when deleting subcategories', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(
        categoryRepository.deleteSubcategoriesByCategoryId('category-id', 'household-id')
      ).rejects.toThrow(AppError);
    });
  });
});
