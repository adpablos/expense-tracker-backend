import { Pool } from 'pg';

import logger from '../config/logger';
import { Category } from '../models/Category';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

import { NotificationService } from './external/notificationService';

export class CategoryService {
  private db: Pool;
  private notificationService: NotificationService;

  constructor(db: Pool) {
    this.db = db;
    this.notificationService = new NotificationService();
  }

  async getAllCategories(householdId: string): Promise<Category[]> {
    logger.info('Fetching all categories for household', { householdId });
    try {
      const result = await this.db.query('SELECT * FROM categories WHERE household_id = $1', [
        householdId,
      ]);
      const categories = result.rows.map(Category.fromDatabase);
      logger.info('Fetched categories', { count: categories.length, householdId });
      return categories;
    } catch (error) {
      logger.error('Error fetching categories', { error: error, householdId });
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
      const dbCategory = category.toDatabase();
      const result = await this.db.query(
        'INSERT INTO categories (id, name, household_id) VALUES ($1, $2, $3) RETURNING *',
        [dbCategory.id, dbCategory.name, dbCategory.household_id]
      );
      const createdCategory = Category.fromDatabase(result.rows[0]);
      logger.info('Created category', { category: createdCategory });

      await this.notificationService.notifyHouseholdMembers(
        category.householdId,
        `Nueva categoría creada: ${category.name}`
      );

      return createdCategory;
    } catch (error) {
      logger.error('Error creating category', { error: error });
      throw new AppError('Error creating category', 500);
    }
  }

  async updateCategory(id: string, name: string, householdId: string): Promise<Category> {
    logger.info('Updating category', { id, name, householdId });
    try {
      const result = await this.db.query(
        'UPDATE categories SET name = $1 WHERE id = $2 AND household_id = $3 RETURNING *',
        [name, id, householdId]
      );
      if (result.rows.length === 0) {
        logger.warn('Category not found', { id, householdId });
        throw new AppError('Category not found', 404);
      }
      const updatedCategory = Category.fromDatabase(result.rows[0]);
      logger.info('Updated category', { category: updatedCategory });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Categoría actualizada: ${updatedCategory.name}`
      );

      return updatedCategory;
    } catch (error) {
      logger.error('Error updating category', { error: error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating category', 500);
    }
  }

  async deleteCategory(id: string, householdId: string): Promise<void> {
    logger.info('Deleting category', { id, householdId });
    try {
      const result = await this.db.query(
        'DELETE FROM categories WHERE id = $1 AND household_id = $2',
        [id, householdId]
      );
      if (result.rowCount === 0) {
        logger.warn('Category not found', { id, householdId });
        throw new AppError('Category not found', 404);
      }
      logger.info('Deleted category', { id, householdId, rowCount: result.rowCount });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Categoría eliminada: ID ${id}`
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23503') {
          logger.error('Cannot delete category due to existing subcategories: %s', dbError.detail);
          throw new AppError(
            'Cannot delete category with associated subcategories. Use force=true to force deletion.',
            400
          );
        }
      }
      logger.error('Error deleting category', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting category', 500);
    }
  }

  async deleteSubcategoriesByCategoryId(categoryId: string, householdId: string): Promise<void> {
    logger.info('Deleting subcategories for categoryId: %s', categoryId);
    try {
      await this.db.query(
        'DELETE FROM subcategories WHERE category_id = $1 AND household_id = $2',
        [categoryId, householdId]
      );
      logger.info('Deleted subcategories for categoryId: %s', categoryId);
    } catch (error) {
      logger.error('Error deleting subcategories for categoryId: %s, error: %s', categoryId, error);
      throw new AppError('Error deleting subcategories', 500);
    }
  }
}
