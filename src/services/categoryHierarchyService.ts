import { injectable, inject } from 'inversify';

import logger from '../config/logger';
import { Category } from '../models/Category';
import { Subcategory } from '../models/Subcategory';
import { DI_TYPES } from '../config/di';
import { AppError } from '../utils/AppError';

import { CategoryService } from './categoryService';
import { SubcategoryService } from './subcategoryService';

@injectable()
export class CategoryHierarchyService {
  constructor(
    @inject(DI_TYPES.CategoryService) private categoryService: CategoryService,
    @inject(DI_TYPES.SubcategoryService) private subcategoryService: SubcategoryService
  ) {}

  async getCategoriesAndSubcategories(householdId: string): Promise<string> {
    logger.info('Fetching categories and subcategories', { householdId });
    try {
      const hierarchy = await this.getCategoryHierarchy(householdId);
      return this.formatHierarchyToString(hierarchy);
    } catch (error) {
      logger.error('Error fetching categories and subcategories', { error, householdId });
      throw new AppError('Error fetching categories and subcategories', 500);
    }
  }

  async getCategoryHierarchy(householdId: string): Promise<{ [key: string]: string[] }> {
    logger.info('Fetching category hierarchy', { householdId });
    try {
      const categories = await this.categoryService.getAllCategories(householdId);
      const subcategories = await this.subcategoryService.getAllSubcategories(householdId);

      const hierarchy = this.buildHierarchy(categories, subcategories);

      logger.info('Fetched category hierarchy', {
        householdId,
        categoriesCount: Object.keys(hierarchy).length,
      });
      return hierarchy;
    } catch (error) {
      logger.error('Error fetching category hierarchy', { error, householdId });
      throw new AppError('Error fetching category hierarchy', 500);
    }
  }

  async getCategoryWithSubcategories(
    householdId: string,
    categoryId: string
  ): Promise<{ category: Category; subcategories: Subcategory[] }> {
    logger.info('Fetching category with subcategories', { householdId, categoryId });
    try {
      const category = await this.categoryService.getCategoryById(categoryId);
      if (!category || category.householdId !== householdId) {
        throw new AppError('Category not found', 404);
      }
      const subcategories = await this.subcategoryService.getSubcategoriesByCategoryId(
        categoryId,
        householdId
      );
      return { category, subcategories };
    } catch (error) {
      logger.error('Error fetching category with subcategories', {
        error,
        householdId,
        categoryId,
      });
      throw error instanceof AppError
        ? error
        : new AppError('Error fetching category with subcategories', 500);
    }
  }

  private buildHierarchy(
    categories: Category[],
    subcategories: Subcategory[]
  ): { [key: string]: string[] } {
    const hierarchy: { [key: string]: string[] } = {};
    categories.forEach((category) => {
      hierarchy[category.name] = subcategories
        .filter((subcategory) => subcategory.categoryId === category.id)
        .map((subcategory) => subcategory.name);
    });
    return hierarchy;
  }

  private formatHierarchyToString(hierarchy: { [key: string]: string[] }): string {
    return Object.entries(hierarchy)
      .map(([category, subs]) => `- ${category}: ${subs.join(', ')}`)
      .join('\n');
  }
}
