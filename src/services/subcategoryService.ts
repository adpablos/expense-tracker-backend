import { injectable, inject } from 'inversify';

import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { Subcategory } from '../models/Subcategory';
import { SubcategoryRepository } from '../repositories/subcategoryRepository';
import { AppError } from '../utils/AppError';

import { NotificationService } from './external/notificationService';

@injectable()
export class SubcategoryService {
  constructor(
    @inject(DI_TYPES.SubcategoryRepository) private subcategoryRepository: SubcategoryRepository,
    @inject(DI_TYPES.NotificationService) private notificationService: NotificationService
  ) {}

  async getAllSubcategories(householdId: string): Promise<Subcategory[]> {
    logger.info('Fetching all subcategories for household', { householdId });
    try {
      const subcategories = await this.subcategoryRepository.getAllSubcategories(householdId);
      logger.info('Fetched subcategories', { count: subcategories.length, householdId });
      return subcategories;
    } catch (error) {
      logger.error('Error fetching subcategories', { error, householdId });
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
      const createdSubcategory = await this.subcategoryRepository.createSubcategory(subcategory);
      logger.info('Created subcategory', { subcategory: createdSubcategory });

      await this.notificationService.notifyHouseholdMembers(
        createdSubcategory.householdId,
        `Nueva subcategoría creada: ${createdSubcategory.name}`
      );

      return createdSubcategory;
    } catch (error) {
      logger.error('Error creating subcategory', { error });
      if (error instanceof AppError) throw error;
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
      const updatedSubcategory = await this.subcategoryRepository.updateSubcategory(
        id,
        name,
        categoryId,
        householdId
      );
      logger.info('Updated subcategory', { subcategory: updatedSubcategory });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Subcategoría actualizada: ${updatedSubcategory.name}`
      );

      return updatedSubcategory;
    } catch (error) {
      logger.error('Error updating subcategory', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating subcategory', 500);
    }
  }

  async deleteSubcategory(id: string, householdId: string): Promise<void> {
    logger.info('Deleting subcategory', { id, householdId });
    try {
      await this.subcategoryRepository.deleteSubcategory(id, householdId);
      logger.info('Deleted subcategory', { id, householdId });

      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Subcategoría eliminada: ID ${id}`
      );
    } catch (error) {
      logger.error('Error deleting subcategory', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting subcategory', 500);
    }
  }

  async getSubcategoryById(id: string, householdId: string): Promise<Subcategory | null> {
    logger.info('Fetching subcategory by ID', { id, householdId });
    try {
      const subcategory = await this.subcategoryRepository.getSubcategoryById(id, householdId);
      if (!subcategory) {
        logger.warn('Subcategory not found', { id, householdId });
        return null;
      }
      logger.info('Fetched subcategory', { id, householdId });
      return subcategory;
    } catch (error) {
      logger.error('Error fetching subcategory by ID', { error, id, householdId });
      throw new AppError('Error fetching subcategory', 500);
    }
  }

  async getSubcategoriesByCategoryId(
    categoryId: string,
    householdId: string
  ): Promise<Subcategory[]> {
    logger.info('Fetching subcategories by category ID', { categoryId, householdId });
    try {
      const subcategories = await this.subcategoryRepository.getSubcategoriesByCategoryId(
        categoryId,
        householdId
      );
      logger.info('Fetched subcategories', {
        count: subcategories.length,
        categoryId,
        householdId,
      });
      return subcategories;
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
