import 'reflect-metadata';

import { Category } from '../../../src/models/Category';
import { Subcategory } from '../../../src/models/Subcategory';
import { CategoryHierarchyService } from '../../../src/services/categoryHierarchyService';
import { CategoryService } from '../../../src/services/categoryService';
import { SubcategoryService } from '../../../src/services/subcategoryService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/services/categoryService');
jest.mock('../../../src/services/subcategoryService');
jest.mock('../../../src/config/logger');

describe('CategoryHierarchyService', () => {
  let categoryHierarchyService: CategoryHierarchyService;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let mockSubcategoryService: jest.Mocked<SubcategoryService>;

  beforeEach(() => {
    mockCategoryService = {
      getAllCategories: jest.fn(),
      getCategoryById: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;
    mockSubcategoryService = {
      getAllSubcategories: jest.fn(),
      getSubcategoriesByCategoryId: jest.fn(),
    } as unknown as jest.Mocked<SubcategoryService>;
    categoryHierarchyService = new CategoryHierarchyService(
      mockCategoryService,
      mockSubcategoryService
    );
  });

  describe('getCategoriesAndSubcategories', () => {
    it('should return formatted string of categories and subcategories', async () => {
      const mockCategories = [
        new Category('Food', 'h1', '1'),
        new Category('Transport', 'h1', '2'),
      ];
      const mockSubcategories = [
        new Subcategory('Groceries', '1', 'h1', 's1'),
        new Subcategory('Restaurants', '1', 'h1', 's2'),
        new Subcategory('Bus', '2', 'h1', 's3'),
      ];
      mockCategoryService.getAllCategories.mockResolvedValue(mockCategories);
      mockSubcategoryService.getAllSubcategories.mockResolvedValue(mockSubcategories);

      const result = await categoryHierarchyService.getCategoriesAndSubcategories('h1');
      expect(result).toBe('- Food: Groceries, Restaurants\n- Transport: Bus');
    });

    it('should throw AppError when there is an error', async () => {
      mockCategoryService.getAllCategories.mockRejectedValue(new Error('Database error'));

      await expect(categoryHierarchyService.getCategoriesAndSubcategories('h1')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getCategoryHierarchy', () => {
    it('should return category hierarchy object', async () => {
      const mockCategories = [
        new Category('Food', 'h1', '1'),
        new Category('Transport', 'h1', '2'),
      ];
      const mockSubcategories = [
        new Subcategory('Groceries', '1', 'h1', 's1'),
        new Subcategory('Restaurants', '1', 'h1', 's2'),
        new Subcategory('Bus', '2', 'h1', 's3'),
      ];
      mockCategoryService.getAllCategories.mockResolvedValue(mockCategories);
      mockSubcategoryService.getAllSubcategories.mockResolvedValue(mockSubcategories);

      const result = await categoryHierarchyService.getCategoryHierarchy('h1');
      expect(result).toEqual({
        Food: ['Groceries', 'Restaurants'],
        Transport: ['Bus'],
      });
    });

    it('should throw AppError when there is an error', async () => {
      mockCategoryService.getAllCategories.mockRejectedValue(new Error('Database error'));

      await expect(categoryHierarchyService.getCategoryHierarchy('h1')).rejects.toThrow(AppError);
    });
  });

  describe('getCategoryWithSubcategories', () => {
    it('should return category with its subcategories', async () => {
      const mockCategory = new Category('Food', 'h1', '1');
      const mockSubcategories = [
        new Subcategory('Groceries', '1', 'h1', 's1'),
        new Subcategory('Restaurants', '1', 'h1', 's2'),
      ];
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);
      mockSubcategoryService.getSubcategoriesByCategoryId.mockResolvedValue(mockSubcategories);

      const result = await categoryHierarchyService.getCategoryWithSubcategories('h1', '1');
      expect(result).toEqual({
        category: mockCategory,
        subcategories: mockSubcategories,
      });
    });

    it('should throw AppError when category is not found', async () => {
      mockCategoryService.getCategoryById.mockRejectedValue(
        new AppError('Category not found', 404)
      );

      await expect(
        categoryHierarchyService.getCategoryWithSubcategories('h1', '1')
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError when category does not belong to household', async () => {
      const mockCategory = new Category('Food', 'h2', '1');
      mockCategoryService.getCategoryById.mockResolvedValue(mockCategory);

      await expect(
        categoryHierarchyService.getCategoryWithSubcategories('h1', '1')
      ).rejects.toThrow(AppError);
    });
  });
});
