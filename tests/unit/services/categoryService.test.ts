import 'reflect-metadata';
import { Category } from '../../../src/models/Category';
import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { CategoryService } from '../../../src/services/categoryService';
import { NotificationService } from '../../../src/services/external/notificationService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/categoryRepository');
jest.mock('../../../src/services/external/notificationService');
jest.mock('../../../src/config/logger');

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockCategoryRepository = {
      getAllCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      deleteSubcategoriesByCategoryId: jest.fn(),
      getCategoryById: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    mockNotificationService = {
      notifyHouseholdMembers: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    categoryService = new CategoryService(mockCategoryRepository, mockNotificationService);
  });

  describe('getCategoryById', () => {
    it('should return a category when found', async () => {
      const categoryId = 'category-id';
      const mockCategory = new Category('Test Category', 'household-id', categoryId);

      mockCategoryRepository.getCategoryById.mockResolvedValue(mockCategory);

      const result = await categoryService.getCategoryById(categoryId);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryRepository.getCategoryById).toHaveBeenCalledWith(categoryId);
    });

    it('should throw an AppError when the category is not found', async () => {
      mockCategoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(categoryService.getCategoryById('non-existent-id')).rejects.toThrow(AppError);
    });

    it('should handle errors when fetching a category', async () => {
      mockCategoryRepository.getCategoryById.mockRejectedValue(new Error('Database error'));

      await expect(categoryService.getCategoryById('category-id')).rejects.toThrow(AppError);
    });
  });

  describe('getAllCategories', () => {
    it('should get all categories for a household', async () => {
      const householdId = 'household-id';
      const mockCategories = [
        new Category('Category 1', householdId),
        new Category('Category 2', householdId),
      ];

      mockCategoryRepository.getAllCategories.mockResolvedValue(mockCategories);

      const result = await categoryService.getAllCategories(householdId);

      expect(result).toEqual(mockCategories);
      expect(mockCategoryRepository.getAllCategories).toHaveBeenCalledWith(householdId);
    });

    it('should handle errors when fetching categories', async () => {
      const householdId = 'household-id';
      mockCategoryRepository.getAllCategories.mockRejectedValue(new Error('Database error'));

      await expect(categoryService.getAllCategories(householdId)).rejects.toThrow(AppError);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const newCategory = new Category('New Category', 'household-id');
      const createdCategory = new Category('New Category', 'household-id', 'new-category-id');

      mockCategoryRepository.createCategory.mockResolvedValue(createdCategory);

      const result = await categoryService.createCategory(newCategory);

      expect(result).toEqual(createdCategory);
      expect(mockCategoryRepository.createCategory).toHaveBeenCalledWith(newCategory);
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        'household-id',
        expect.stringContaining('Nueva categoría creada:')
      );
    });

    it('should throw an error for invalid category data', async () => {
      const invalidCategory = new Category('', 'household-id');
      await expect(categoryService.createCategory(invalidCategory)).rejects.toThrow(AppError);
    });
  });

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';
      const updatedName = 'Updated Category';
      const updatedCategory = new Category(updatedName, householdId, categoryId);

      mockCategoryRepository.updateCategory.mockResolvedValue(updatedCategory);

      const result = await categoryService.updateCategory(categoryId, updatedName, householdId);

      expect(result).toEqual(updatedCategory);
      expect(mockCategoryRepository.updateCategory).toHaveBeenCalledWith(
        categoryId,
        updatedName,
        householdId
      );
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        householdId,
        expect.stringContaining('Categoría actualizada:')
      );
    });

    it('should throw an error if category update fails', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';
      const updatedName = 'Updated Category';

      mockCategoryRepository.updateCategory.mockRejectedValue(new Error('Database error'));

      await expect(
        categoryService.updateCategory(categoryId, updatedName, householdId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';

      mockCategoryRepository.deleteCategory.mockResolvedValue();

      await categoryService.deleteCategory(categoryId, householdId);

      expect(mockCategoryRepository.deleteCategory).toHaveBeenCalledWith(categoryId, householdId);
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        householdId,
        expect.stringContaining('Categoría eliminada:')
      );
    });

    it('should handle errors when deleting a category', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';

      mockCategoryRepository.deleteCategory.mockRejectedValue(new Error('Database error'));

      await expect(categoryService.deleteCategory(categoryId, householdId)).rejects.toThrow(
        AppError
      );
    });
  });

  describe('deleteSubcategoriesByCategoryId', () => {
    it('should delete subcategories by category ID', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';

      mockCategoryRepository.deleteSubcategoriesByCategoryId.mockResolvedValue();

      await categoryService.deleteSubcategoriesByCategoryId(categoryId, householdId);

      expect(mockCategoryRepository.deleteSubcategoriesByCategoryId).toHaveBeenCalledWith(
        categoryId,
        householdId
      );
    });

    it('should handle errors when deleting subcategories', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';

      mockCategoryRepository.deleteSubcategoriesByCategoryId.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        categoryService.deleteSubcategoriesByCategoryId(categoryId, householdId)
      ).rejects.toThrow(AppError);
    });
  });
});
