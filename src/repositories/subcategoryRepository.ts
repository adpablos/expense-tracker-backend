import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { Subcategory } from '../models/Subcategory';
import { AppError } from '../utils/AppError';

import { DatabaseError } from './errors';

@injectable()
export class SubcategoryRepository {
  constructor(@inject(DI_TYPES.DbPool) private db: Pool & { connect: () => Promise<PoolClient> }) {}

  async getAllSubcategories(householdId: string): Promise<Subcategory[]> {
    try {
      const result = await this.db.query('SELECT * FROM subcategories WHERE household_id = $1', [
        householdId,
      ]);
      return result.rows.map(Subcategory.fromDatabase);
    } catch (error) {
      logger.error('Error fetching subcategories', { error, householdId });
      throw new AppError('Error fetching subcategories', 500);
    }
  }

  async createSubcategory(subcategory: Subcategory): Promise<Subcategory> {
    try {
      const dbSubcategory = subcategory.toDatabase();
      const result = await this.db.query(
        'INSERT INTO subcategories (id, name, category_id, household_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [
          dbSubcategory.id,
          dbSubcategory.name,
          dbSubcategory.category_id,
          dbSubcategory.household_id,
        ]
      );
      return Subcategory.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error creating subcategory', { error });
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23503') {
          throw new AppError('Parent category not found', 404);
        }
      }
      throw new AppError('Error creating subcategory', 500);
    }
  }

  async updateSubcategory(
    id: string,
    name: string,
    categoryId: string,
    householdId: string
  ): Promise<Subcategory> {
    try {
      const result = await this.db.query(
        'UPDATE subcategories SET name = $1, category_id = $2 WHERE id = $3 AND household_id = $4 RETURNING *',
        [name, categoryId, id, householdId]
      );
      if (result.rows.length === 0) {
        throw new AppError('Subcategory not found', 404);
      }
      return Subcategory.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error updating subcategory', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating subcategory', 500);
    }
  }

  async deleteSubcategory(id: string, householdId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM subcategories WHERE id = $1 AND household_id = $2',
        [id, householdId]
      );
      if (result.rowCount === 0) {
        throw new AppError('Subcategory not found', 404);
      }
    } catch (error) {
      logger.error('Error deleting subcategory', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting subcategory', 500);
    }
  }

  async getSubcategoryById(id: string, householdId: string): Promise<Subcategory | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM subcategories WHERE id = $1 AND household_id = $2',
        [id, householdId]
      );
      if (result.rows.length === 0) {
        return null;
      }
      return Subcategory.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching subcategory by ID', { error, id, householdId });
      throw new AppError('Error fetching subcategory', 500);
    }
  }

  async getSubcategoriesByCategoryId(
    categoryId: string,
    householdId: string
  ): Promise<Subcategory[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM subcategories WHERE category_id = $1 AND household_id = $2',
        [categoryId, householdId]
      );
      return result.rows.map(Subcategory.fromDatabase);
    } catch (error) {
      logger.error('Error fetching subcategories by category ID', {
        error,
        categoryId,
        householdId,
      });
      throw new AppError('Error fetching subcategories', 500);
    }
  }
}
