import {Pool} from 'pg';
import {CategoryService} from './categoryService';
import {SubcategoryService} from './subcategoryService';
import logger from '../config/logger';

export class CategoryHierarchyService {
    private db: Pool;
    private categoryService: CategoryService;
    private subcategoryService: SubcategoryService;

    constructor(db: Pool) {
        this.db = db;
        this.categoryService = new CategoryService(db);
        this.subcategoryService = new SubcategoryService(db);
    }

    async getCategoriesAndSubcategories(): Promise<string> {
        logger.info('Fetching categories and subcategories');
        try {
            const categories = await this.categoryService.getAllCategories();
            logger.info('Fetched categories', {count: categories.length});

            const subcategories = await this.subcategoryService.getAllSubcategories();
            logger.info('Fetched subcategories', {count: subcategories.length});

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

            logger.info('Formatted categories and subcategories string');
            return categoriesString;
        } catch (error) {
            logger.error('Error fetching categories and subcategories', {error: error});
            throw new Error('Error fetching categories and subcategories');
        }
    }
}
