import 'reflect-metadata';
import { Pool } from 'pg';

import { DI_TYPES } from '../../../src/config/di';
import { Subcategory } from '../../../src/models/Subcategory';
import { SubcategoryRepository } from '../../../src/repositories/subcategoryRepository';
import { AppError } from '../../../src/utils/AppError';
import { createUnitTestContainer } from '../../config/testContainers';

describe('SubcategoryRepository', () => {
  let subcategoryRepository: SubcategoryRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const container = createUnitTestContainer({ mockDbPool: true });
    mockPool = container.get<Pool>(DI_TYPES.DbPool) as jest.Mocked<Pool>;
    subcategoryRepository = container.get<SubcategoryRepository>(DI_TYPES.SubcategoryRepository);
  });

  describe('getAllSubcategories', () => {
    it('should return all subcategories for a household', async () => {
      const householdId = 'household-id';
      const mockSubcategories = [
        { id: 'sub1', name: 'Subcategory 1', category_id: 'cat1', household_id: householdId },
        { id: 'sub2', name: 'Subcategory 2', category_id: 'cat2', household_id: householdId },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockSubcategories });

      const result = await subcategoryRepository.getAllSubcategories(householdId);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Subcategory);
      expect(result[0].id).toBe('sub1');
      expect(result[1].id).toBe('sub2');
    });

    it('should throw an error if the query fails', async () => {
      const householdId = 'household-id';
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(subcategoryRepository.getAllSubcategories(householdId)).rejects.toThrow(
        AppError
      );
    });
  });

  describe('createSubcategory', () => {
    it('should create a new subcategory successfully', async () => {
      const subcategory = new Subcategory('Test Subcategory', 'category-id', 'household-id');
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'new-id',
            name: 'Test Subcategory',
            category_id: 'category-id',
            household_id: 'household-id',
          },
        ],
      });

      const result = await subcategoryRepository.createSubcategory(subcategory);

      expect(result).toBeInstanceOf(Subcategory);
      expect(result.id).toBe('new-id');
      expect(result.name).toBe('Test Subcategory');
      expect(result.categoryId).toBe('category-id');
      expect(result.householdId).toBe('household-id');
    });

    it('should handle errors when creating a subcategory', async () => {
      const subcategory = new Subcategory('Test Subcategory', 'category-id', 'household-id');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(subcategoryRepository.createSubcategory(subcategory)).rejects.toThrow(AppError);
    });

    it('should throw an error when parent category is not found', async () => {
      const subcategory = new Subcategory(
        'Test Subcategory',
        'non-existent-category',
        'household-id'
      );
      const error = new Error('Foreign key constraint') as Error & { code?: string };
      error.code = '23503';
      (mockPool.query as jest.Mock).mockRejectedValueOnce(error);

      await expect(subcategoryRepository.createSubcategory(subcategory)).rejects.toThrow(
        'Parent category not found'
      );
    });
  });

  describe('updateSubcategory', () => {
    it('should update a subcategory successfully', async () => {
      const subcategoryId = 'subcategory-id';
      const newName = 'Updated Subcategory';
      const categoryId = 'category-id';
      const householdId = 'household-id';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { id: subcategoryId, name: newName, category_id: categoryId, household_id: householdId },
        ],
      });

      const result = await subcategoryRepository.updateSubcategory(
        subcategoryId,
        newName,
        categoryId,
        householdId
      );

      expect(result).toBeInstanceOf(Subcategory);
      expect(result.id).toBe(subcategoryId);
      expect(result.name).toBe(newName);
      expect(result.categoryId).toBe(categoryId);
      expect(result.householdId).toBe(householdId);
    });

    it('should throw an error if the subcategory is not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        subcategoryRepository.updateSubcategory(
          'non-existent-id',
          'New Name',
          'category-id',
          'household-id'
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteSubcategory', () => {
    it('should delete a subcategory successfully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      await expect(
        subcategoryRepository.deleteSubcategory('subcategory-id', 'household-id')
      ).resolves.not.toThrow();
    });

    it('should throw an error if the subcategory is not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      await expect(
        subcategoryRepository.deleteSubcategory('non-existent-id', 'household-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getSubcategoryById', () => {
    it('should return a subcategory when found', async () => {
      const subcategoryId = 'subcategory-id';
      const householdId = 'household-id';
      const mockSubcategory = {
        id: subcategoryId,
        name: 'Test Subcategory',
        category_id: 'category-id',
        household_id: householdId,
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSubcategory] });

      const result = await subcategoryRepository.getSubcategoryById(subcategoryId, householdId);

      expect(result).toBeInstanceOf(Subcategory);
      expect(result?.id).toBe(subcategoryId);
      expect(result?.name).toBe('Test Subcategory');
      expect(result?.categoryId).toBe('category-id');
      expect(result?.householdId).toBe(householdId);
    });

    it('should return null when subcategory is not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await subcategoryRepository.getSubcategoryById(
        'non-existent-id',
        'household-id'
      );

      expect(result).toBeNull();
    });

    it('should throw an error if the query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(
        subcategoryRepository.getSubcategoryById('subcategory-id', 'household-id')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getSubcategoriesByCategoryId', () => {
    it('should return subcategories for a given category ID', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';
      const mockSubcategories = [
        { id: 'sub1', name: 'Subcategory 1', category_id: categoryId, household_id: householdId },
        { id: 'sub2', name: 'Subcategory 2', category_id: categoryId, household_id: householdId },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockSubcategories });

      const result = await subcategoryRepository.getSubcategoriesByCategoryId(
        categoryId,
        householdId
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Subcategory);
      expect(result[0].id).toBe('sub1');
      expect(result[1].id).toBe('sub2');
      expect(result[0].categoryId).toBe(categoryId);
      expect(result[1].categoryId).toBe(categoryId);
    });

    it('should return an empty array when no subcategories are found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await subcategoryRepository.getSubcategoriesByCategoryId(
        'category-id',
        'household-id'
      );

      expect(result).toEqual([]);
    });

    it('should throw an error if the query fails', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(
        subcategoryRepository.getSubcategoriesByCategoryId('category-id', 'household-id')
      ).rejects.toThrow(AppError);
    });
  });
});
