import 'reflect-metadata';
import { Subcategory } from '../../../src/models/Subcategory';
import { SubcategoryRepository } from '../../../src/repositories/subcategoryRepository';
import { NotificationService } from '../../../src/services/external/notificationService';
import { SubcategoryService } from '../../../src/services/subcategoryService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/subcategoryRepository');
jest.mock('../../../src/services/external/notificationService');
jest.mock('../../../src/config/logger');

describe('SubcategoryService', () => {
  let subcategoryService: SubcategoryService;
  let mockSubcategoryRepository: jest.Mocked<SubcategoryRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockSubcategoryRepository = {
      getAllSubcategories: jest.fn(),
      createSubcategory: jest.fn(),
      updateSubcategory: jest.fn(),
      deleteSubcategory: jest.fn(),
      getSubcategoryById: jest.fn(),
      getSubcategoriesByCategoryId: jest.fn(),
    } as unknown as jest.Mocked<SubcategoryRepository>;

    mockNotificationService = {
      notifyHouseholdMembers: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    subcategoryService = new SubcategoryService(mockSubcategoryRepository, mockNotificationService);
  });

  describe('getAllSubcategories', () => {
    it('should get all subcategories for a household', async () => {
      const householdId = 'household-id';
      const mockSubcategories = [
        new Subcategory('Subcategory 1', 'category-id-1', householdId),
        new Subcategory('Subcategory 2', 'category-id-2', householdId),
      ];

      mockSubcategoryRepository.getAllSubcategories.mockResolvedValue(mockSubcategories);

      const result = await subcategoryService.getAllSubcategories(householdId);

      expect(result).toEqual(mockSubcategories);
      expect(mockSubcategoryRepository.getAllSubcategories).toHaveBeenCalledWith(householdId);
    });

    it('should handle errors when fetching subcategories', async () => {
      const householdId = 'household-id';
      mockSubcategoryRepository.getAllSubcategories.mockRejectedValue(new Error('Database error'));

      await expect(subcategoryService.getAllSubcategories(householdId)).rejects.toThrow(AppError);
    });
  });

  describe('createSubcategory', () => {
    it('should create a new subcategory', async () => {
      const newSubcategory = new Subcategory('New Subcategory', 'category-id', 'household-id');
      const createdSubcategory = new Subcategory(
        'New Subcategory',
        'category-id',
        'household-id',
        'new-subcategory-id'
      );

      mockSubcategoryRepository.createSubcategory.mockResolvedValue(createdSubcategory);

      const result = await subcategoryService.createSubcategory(newSubcategory);

      expect(result).toEqual(createdSubcategory);
      expect(mockSubcategoryRepository.createSubcategory).toHaveBeenCalledWith(newSubcategory);
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        'household-id',
        expect.stringContaining('Nueva subcategoría creada:')
      );
    });

    it('should throw an error for invalid subcategory data', async () => {
      const invalidSubcategory = new Subcategory('', '', '');
      await expect(subcategoryService.createSubcategory(invalidSubcategory)).rejects.toThrow(
        AppError
      );
    });
  });

  describe('updateSubcategory', () => {
    it('should update an existing subcategory', async () => {
      const subcategoryId = 'subcategory-id';
      const categoryId = 'category-id';
      const householdId = 'household-id';
      const updatedName = 'Updated Subcategory';
      const updatedSubcategory = new Subcategory(
        updatedName,
        categoryId,
        householdId,
        subcategoryId
      );

      mockSubcategoryRepository.updateSubcategory.mockResolvedValue(updatedSubcategory);

      const result = await subcategoryService.updateSubcategory(
        subcategoryId,
        updatedName,
        categoryId,
        householdId
      );

      expect(result).toEqual(updatedSubcategory);
      expect(mockSubcategoryRepository.updateSubcategory).toHaveBeenCalledWith(
        subcategoryId,
        updatedName,
        categoryId,
        householdId
      );
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        householdId,
        expect.stringContaining('Subcategoría actualizada:')
      );
    });

    it('should throw an error if subcategory update fails', async () => {
      const subcategoryId = 'subcategory-id';
      const categoryId = 'category-id';
      const householdId = 'household-id';
      const updatedName = 'Updated Subcategory';

      mockSubcategoryRepository.updateSubcategory.mockRejectedValue(new Error('Database error'));

      await expect(
        subcategoryService.updateSubcategory(subcategoryId, updatedName, categoryId, householdId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteSubcategory', () => {
    it('should delete a subcategory', async () => {
      const subcategoryId = 'subcategory-id';
      const householdId = 'household-id';

      mockSubcategoryRepository.deleteSubcategory.mockResolvedValue();

      await subcategoryService.deleteSubcategory(subcategoryId, householdId);

      expect(mockSubcategoryRepository.deleteSubcategory).toHaveBeenCalledWith(
        subcategoryId,
        householdId
      );
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        householdId,
        expect.stringContaining('Subcategoría eliminada:')
      );
    });

    it('should handle errors when deleting a subcategory', async () => {
      const subcategoryId = 'subcategory-id';
      const householdId = 'household-id';

      mockSubcategoryRepository.deleteSubcategory.mockRejectedValue(new Error('Database error'));

      await expect(
        subcategoryService.deleteSubcategory(subcategoryId, householdId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getSubcategoryById', () => {
    it('should return a subcategory when found', async () => {
      const subcategoryId = 'subcategory-id';
      const householdId = 'household-id';
      const mockSubcategory = new Subcategory(
        'Test Subcategory',
        'category-id',
        householdId,
        subcategoryId
      );

      mockSubcategoryRepository.getSubcategoryById.mockResolvedValue(mockSubcategory);

      const result = await subcategoryService.getSubcategoryById(subcategoryId, householdId);

      expect(result).toEqual(mockSubcategory);
      expect(mockSubcategoryRepository.getSubcategoryById).toHaveBeenCalledWith(
        subcategoryId,
        householdId
      );
    });

    it('should return null when subcategory is not found', async () => {
      const subcategoryId = 'non-existent-id';
      const householdId = 'household-id';

      mockSubcategoryRepository.getSubcategoryById.mockResolvedValue(null);

      const result = await subcategoryService.getSubcategoryById(subcategoryId, householdId);

      expect(result).toBeNull();
    });

    it('should throw an AppError when there is a database error', async () => {
      const subcategoryId = 'subcategory-id';
      const householdId = 'household-id';

      mockSubcategoryRepository.getSubcategoryById.mockRejectedValue(new Error('Database error'));

      await expect(
        subcategoryService.getSubcategoryById(subcategoryId, householdId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getSubcategoriesByCategoryId', () => {
    it('should return subcategories for a given category ID', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';
      const mockSubcategories = [
        new Subcategory('Subcategory 1', categoryId, householdId, 'sub-1'),
        new Subcategory('Subcategory 2', categoryId, householdId, 'sub-2'),
      ];

      mockSubcategoryRepository.getSubcategoriesByCategoryId.mockResolvedValue(mockSubcategories);

      const result = await subcategoryService.getSubcategoriesByCategoryId(categoryId, householdId);

      expect(result).toEqual(mockSubcategories);
      expect(mockSubcategoryRepository.getSubcategoriesByCategoryId).toHaveBeenCalledWith(
        categoryId,
        householdId
      );
    });

    it('should return an empty array when no subcategories are found', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';

      mockSubcategoryRepository.getSubcategoriesByCategoryId.mockResolvedValue([]);

      const result = await subcategoryService.getSubcategoriesByCategoryId(categoryId, householdId);

      expect(result).toEqual([]);
    });

    it('should throw an AppError when there is a database error', async () => {
      const categoryId = 'category-id';
      const householdId = 'household-id';

      mockSubcategoryRepository.getSubcategoriesByCategoryId.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        subcategoryService.getSubcategoriesByCategoryId(categoryId, householdId)
      ).rejects.toThrow(AppError);
    });
  });
});
