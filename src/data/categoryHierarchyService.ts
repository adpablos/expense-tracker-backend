import { Pool } from 'pg';
import { CategoryService } from './categoryService';
import { SubcategoryService } from './subcategoryService';

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
        const categories = await this.categoryService.getAllCategories();
        const subcategories = await this.subcategoryService.getAllSubcategories();

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

        return categoriesString;
    }
}