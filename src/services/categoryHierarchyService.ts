import { Pool } from 'pg';
import { CategoryService } from './categoryService';
import { SubcategoryService } from './subcategoryService';
import logger from '../config/logger';
import { AppError } from '../utils/AppError';

export class CategoryHierarchyService {
    private db: Pool;
    private categoryService: CategoryService;
    private subcategoryService: SubcategoryService;

    constructor(db: Pool) {
        this.db = db;
        this.categoryService = new CategoryService(db);
        this.subcategoryService = new SubcategoryService(db);
    }

    async getCategoriesAndSubcategories(householdId: string): Promise<string> {
        logger.info('Fetching categories and subcategories', { householdId });
        try {
            const categories = await this.categoryService.getAllCategories(householdId);
            logger.info('Fetched categories', { count: categories.length, householdId });

            const subcategories = await this.subcategoryService.getAllSubcategories(householdId);
            logger.info('Fetched subcategories', { count: subcategories.length, householdId });

            const categoriesMap: { [key: string]: string[] } = {};

            categories.forEach(category => {
                categoriesMap[category.name] = subcategories
                    .filter(subcategory => subcategory.categoryId === category.id)
                    .map(subcategory => subcategory.name);
            });

            let categoriesString = '';
            for (const [category, subs] of Object.entries(categoriesMap)) {
                categoriesString += `- ${category}: ${subs.join(', ')} \n`;
            }

            logger.info('Formatted categories and subcategories string', { householdId });
            return categoriesString;
        } catch (error) {
            logger.error('Error fetching categories and subcategories', { error, householdId });
            throw new AppError('Error fetching categories and subcategories', 500);
        }
    }

    async getCategoryHierarchy(householdId: string): Promise<{[key: string]: string[]}> {
        logger.info('Fetching category hierarchy', { householdId });
        try {
            const categories = await this.categoryService.getAllCategories(householdId);
            const subcategories = await this.subcategoryService.getAllSubcategories(householdId);

            const hierarchy: {[key: string]: string[]} = {};

            categories.forEach(category => {
                hierarchy[category.name] = subcategories
                    .filter(subcategory => subcategory.categoryId === category.id)
                    .map(subcategory => subcategory.name);
            });

            logger.info('Fetched category hierarchy', { householdId, categoriesCount: Object.keys(hierarchy).length });
            return hierarchy;
        } catch (error) {
            logger.error('Error fetching category hierarchy', { error, householdId });
            throw new AppError('Error fetching category hierarchy', 500);
        }
    }
}