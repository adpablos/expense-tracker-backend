import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import logger from '../config/logger';
import { Category } from '../models/Category';
import { DI_TYPES } from '../types/di';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

@injectable()
export class CategoryRepository {
  constructor(@inject(DI_TYPES.Pool) private db: Pool & { connect: () => Promise<PoolClient> }) {}

  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const result = await this.db.query('SELECT * FROM categories WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return Category.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching category by ID', { error, id });
      throw new AppError('Error fetching category', 500);
    }
  }

  async getAllCategories(householdId: string): Promise<Category[]> {
    try {
      const result = await this.db.query('SELECT * FROM categories WHERE household_id = $1', [
        householdId,
      ]);
      return result.rows.map(Category.fromDatabase);
    } catch (error) {
      logger.error('Error fetching categories', { error, householdId });
      throw new AppError('Error fetching categories', 500);
    }
  }

  async createCategory(category: Category): Promise<Category> {
    try {
      const dbCategory = category.toDatabase();
      const result = await this.db.query(
        'INSERT INTO categories (id, name, household_id) VALUES ($1, $2, $3) RETURNING *',
        [dbCategory.id, dbCategory.name, dbCategory.household_id]
      );
      return Category.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error creating category', { error });
      throw new AppError('Error creating category', 500);
    }
  }

  async updateCategory(id: string, name: string, householdId: string): Promise<Category> {
    try {
      const result = await this.db.query(
        'UPDATE categories SET name = $1 WHERE id = $2 AND household_id = $3 RETURNING *',
        [name, id, householdId]
      );
      if (result.rows.length === 0) {
        throw new AppError('Category not found', 404);
      }
      return Category.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error updating category', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating category', 500);
    }
  }

  async deleteCategory(id: string, householdId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM categories WHERE id = $1 AND household_id = $2',
        [id, householdId]
      );
      if (result.rowCount === 0) {
        throw new AppError('Category not found', 404);
      }
    } catch (error) {
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23503') {
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
    try {
      await this.db.query(
        'DELETE FROM subcategories WHERE category_id = $1 AND household_id = $2',
        [categoryId, householdId]
      );
    } catch (error) {
      logger.error('Error deleting subcategories', { error, categoryId });
      throw new AppError('Error deleting subcategories', 500);
    }
  }
}
