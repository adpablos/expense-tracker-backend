import { Pool, QueryResult } from 'pg';

import { DI_TYPES } from '../../../src/config/di';
import { Category } from '../../../src/models/Category';
import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { AppError } from '../../../src/utils/AppError';
import { createRepositoryTestContainer } from '../../testContainer';

// Definir interfaces para los tipos de datos
interface CategoryRow {
  id: string;
  name: string;
  household_id: string;
}

interface QueryResultRow {
  rowCount?: number;
}

describe('CategoryRepository', () => {
  // Test fixtures
  const TEST_DATA = {
    HOUSEHOLD_ID: 'household-id',
    CATEGORY: {
      ID: 'category-id',
      NAME: 'Test Category',
    },
    ERROR_MESSAGES: {
      DATABASE: 'Database error',
      FOREIGN_KEY: 'Foreign key constraint',
    },
  } as const;

  // Helper function to create a mock category
  const createMockCategory = (
    id: string = TEST_DATA.CATEGORY.ID,
    name: string = TEST_DATA.CATEGORY.NAME
  ): CategoryRow => ({
    id,
    name,
    household_id: TEST_DATA.HOUSEHOLD_ID,
  });

  let categoryRepository: CategoryRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const container = createRepositoryTestContainer();
    mockPool = container.get<Pool>(DI_TYPES.DbPool) as jest.Mocked<Pool>;
    categoryRepository = container.get<CategoryRepository>(DI_TYPES.CategoryRepository);
    jest.clearAllMocks();
  });

  // Helper function to mock successful query
  const mockSuccessfulQuery = <T extends CategoryRow | QueryResultRow>(rows: T[]): void => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows } as QueryResult<T>);
  };

  // Helper function to mock failed query
  const mockFailedQuery = (error: Error): void => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(error);
  };

  describe('getCategoryById', () => {
    it('should return a category when found', async () => {
      const mockCategory = createMockCategory();
      mockSuccessfulQuery([mockCategory]);

      const result = await categoryRepository.getCategoryById(TEST_DATA.CATEGORY.ID);

      expect(result).toBeInstanceOf(Category);
      expect(result).toMatchObject({
        id: TEST_DATA.CATEGORY.ID,
        name: TEST_DATA.CATEGORY.NAME,
        householdId: TEST_DATA.HOUSEHOLD_ID,
      });
    });

    it('should return null when the category is not found', async () => {
      mockSuccessfulQuery([]);
      const result = await categoryRepository.getCategoryById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should throw an AppError if the query fails', async () => {
      mockFailedQuery(new Error(TEST_DATA.ERROR_MESSAGES.DATABASE));
      await expect(categoryRepository.getCategoryById(TEST_DATA.CATEGORY.ID)).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getAllCategories', () => {
    const mockCategories = [
      createMockCategory('cat1', 'Category 1'),
      createMockCategory('cat2', 'Category 2'),
    ];

    it('should return all categories for a household', async () => {
      mockSuccessfulQuery(mockCategories);

      const result = await categoryRepository.getAllCategories(TEST_DATA.HOUSEHOLD_ID);

      expect(result).toHaveLength(mockCategories.length);
      result.forEach((category, index) => {
        expect(category).toBeInstanceOf(Category);
        expect(category).toMatchObject({
          id: mockCategories[index].id,
          name: mockCategories[index].name,
          householdId: TEST_DATA.HOUSEHOLD_ID,
        });
      });
    });

    it('should throw an AppError if the query fails', async () => {
      mockFailedQuery(new Error(TEST_DATA.ERROR_MESSAGES.DATABASE));
      await expect(categoryRepository.getAllCategories(TEST_DATA.HOUSEHOLD_ID)).rejects.toThrow(
        AppError
      );
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
      mockSuccessfulQuery([{ rowCount: 1 }]);
      await expect(
        categoryRepository.deleteCategory(TEST_DATA.CATEGORY.ID, TEST_DATA.HOUSEHOLD_ID)
      ).resolves.not.toThrow();
    });

    it('should throw an AppError for foreign key constraint violation', async () => {
      const foreignKeyError = new Error(TEST_DATA.ERROR_MESSAGES.FOREIGN_KEY) as Error & {
        code?: string;
      };
      foreignKeyError.code = '23503';
      mockFailedQuery(foreignKeyError);

      await expect(
        categoryRepository.deleteCategory(TEST_DATA.CATEGORY.ID, TEST_DATA.HOUSEHOLD_ID)
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
