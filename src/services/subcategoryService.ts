import { Pool } from 'pg';

import logger from '../config/logger';
import { Subcategory } from '../models/Subcategory';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

import { NotificationService } from './external/notificationService';

export class SubcategoryService {
  private db: Pool;
  private notificationService: NotificationService;

  constructor(db: Pool) {
    this.db = db;
    this.notificationService = new NotificationService();
  }

  async getAllSubcategories(householdId: string): Promise<Subcategory[]> {
    logger.info('Fetching all subcategories for household', { householdId });
    try {
      const result = await this.db.query('SELECT * FROM subcategories WHERE household_id = $1', [
        householdId,
      ]);
      const subcategories = result.rows.map(Subcategory.fromDatabase);
      logger.info('Fetched subcategories', { count: subcategories.length, householdId });
      return subcategories;
    } catch (error) {
      logger.error('Error fetching subcategories', { error: error, householdId });
      throw new AppError('Error fetching subcategories', 500);
    }
  }

  async createSubcategory(subcategory: Subcategory): Promise<Subcategory> {
    logger.info('Creating subcategory', {
      subcategory: subcategory.name,
      householdId: subcategory.householdId,
    });

    const errors = subcategory.validate();
    if (errors.length > 0) {
      logger.warn('Invalid subcategory data', { errors });
      throw new AppError(`Invalid subcategory: ${errors.join(', ')}`, 400);
    }

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
      const createdSubcategory = Subcategory.fromDatabase(result.rows[0]);
      logger.info('Created subcategory', { subcategory: createdSubcategory });

      await this.notificationService.notifyHouseholdMembers(
        createdSubcategory.householdId,
        `Nueva subcategoría creada: ${createdSubcategory.name}`
      );

      return createdSubcategory;
    } catch (error: unknown) {
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
    logger.info('Updating subcategory', { id, name, categoryId, householdId });
    try {
      const result = await this.db.query(
        'UPDATE subcategories SET name = $1, category_id = $2 WHERE id = $3 AND household_id = $4 RETURNING *',
        [name, categoryId, id, householdId]
      );
      if (result.rows.length === 0) {
        logger.warn('Subcategory not found', { id, householdId });
        throw new AppError('Subcategory not found', 404);
      }
      const updatedSubcategory = Subcategory.fromDatabase(result.rows[0]);
      logger.info('Updated subcategory', { subcategory: updatedSubcategory });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Subcategoría actualizada: ${updatedSubcategory.name}`
      );

      return updatedSubcategory;
    } catch (error) {
      logger.error('Error updating subcategory', { error: error });
      if (error instanceof AppError) {
        throw error; // Re-lanzamos el AppError original
      }
      // Si no es un AppError, lanzamos un nuevo error genérico
      throw new AppError('Error updating subcategory', 500);
    }
  }

  async deleteSubcategory(id: string, householdId: string): Promise<void> {
    logger.info('Deleting subcategory', { id, householdId });
    try {
      const result = await this.db.query(
        'DELETE FROM subcategories WHERE id = $1 AND household_id = $2',
        [id, householdId]
      );
      if (result.rowCount === 0) {
        logger.warn('Subcategory not found', { id, householdId });
        throw new AppError('Subcategory not found', 404);
      }
      logger.info('Deleted subcategory', { id, householdId, rowCount: result.rowCount });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Subcategoría eliminada: ID ${id}`
      );
    } catch (error) {
      logger.error('Error deleting subcategory', { error: error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting subcategory', 500);
    }
  }
}
