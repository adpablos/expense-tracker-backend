import { injectable, inject } from 'inversify';

import logger from '../config/logger';
import { Category } from '../models/Category';
import { CategoryRepository } from '../repositories/categoryRepository';
import { DI_TYPES } from '../types/di';
import { AppError } from '../utils/AppError';

import { NotificationService } from './external/notificationService';

@injectable()
export class CategoryService {
  constructor(
    @inject(DI_TYPES.CategoryRepository) private categoryRepository: CategoryRepository,
    @inject(DI_TYPES.NotificationService) private notificationService: NotificationService
  ) {}

  async getCategoryById(id: string): Promise<Category> {
    logger.info('Fetching category by ID', { id });
    try {
      const category = await this.categoryRepository.getCategoryById(id);
      if (!category) {
        throw new AppError('Category not found', 404);
      }
      return category;
    } catch (error) {
      logger.error('Error fetching category by ID', { error, id });
      if (error instanceof AppError) throw error;
      throw new AppError('Error fetching category', 500);
    }
  }

  async getAllCategories(householdId: string): Promise<Category[]> {
    logger.info('Fetching all categories for household', { householdId });
    try {
      const categories = await this.categoryRepository.getAllCategories(householdId);
      logger.info('Fetched categories', { count: categories.length, householdId });
      return categories;
    } catch (error) {
      logger.error('Error fetching categories', { error, householdId });
      throw new AppError('Error fetching categories', 500);
    }
  }

  async createCategory(category: Category): Promise<Category> {
    logger.info('Creating category', {
      category: category.name,
      householdId: category.householdId,
    });

    const errors = category.validate();
    if (errors.length > 0) {
      logger.warn('Invalid category data', { errors });
      throw new AppError(`Invalid category: ${errors.join(', ')}`, 400);
    }

    try {
      const createdCategory = await this.categoryRepository.createCategory(category);
      logger.info('Created category', { category: createdCategory });

      await this.notificationService.notifyHouseholdMembers(
        category.householdId,
        `Nueva categoría creada: ${category.name}`
      );

      return createdCategory;
    } catch (error) {
      logger.error('Error creating category', { error });
      throw new AppError('Error creating category', 500);
    }
  }

  async updateCategory(id: string, name: string, householdId: string): Promise<Category> {
    logger.info('Updating category', { id, name, householdId });
    try {
      const updatedCategory = await this.categoryRepository.updateCategory(id, name, householdId);
      logger.info('Updated category', { category: updatedCategory });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Categoría actualizada: ${updatedCategory.name}`
      );

      return updatedCategory;
    } catch (error) {
      logger.error('Error updating category', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating category', 500);
    }
  }

  async deleteCategory(id: string, householdId: string): Promise<void> {
    logger.info('Deleting category', { id, householdId });
    try {
      await this.categoryRepository.deleteCategory(id, householdId);
      logger.info('Deleted category', { id, householdId });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Categoría eliminada: ID ${id}`
      );
    } catch (error) {
      logger.error('Error deleting category', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting category', 500);
    }
  }

  async deleteSubcategoriesByCategoryId(categoryId: string, householdId: string): Promise<void> {
    logger.info('Deleting subcategories for categoryId: %s', categoryId);
    try {
      await this.categoryRepository.deleteSubcategoriesByCategoryId(categoryId, householdId);
      logger.info('Deleted subcategories for categoryId: %s', categoryId);
    } catch (error) {
      logger.error('Error deleting subcategories for categoryId: %s, error: %s', categoryId, error);
      throw new AppError('Error deleting subcategories', 500);
    }
  }
}
