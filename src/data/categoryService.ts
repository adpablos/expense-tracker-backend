import {Pool} from 'pg';
import {Category} from '../models/Category';
import {AppError} from '../utils/AppError';
import logger from '../config/logger';

export class CategoryService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getAllCategories(): Promise<Category[]> {
        logger.info('Fetching all categories');
        try {
            const result = await this.db.query('SELECT * FROM categories');
            const categories = result.rows.map(Category.fromDatabase);
            logger.info('Fetched categories', {count: categories.length});
            return categories;
        } catch (error) {
            logger.error('Error fetching categories', {error: error});
            throw new AppError('Error fetching categories', 500);
        }
    }

    async createCategory(category: Category): Promise<Category> {
        logger.info('Creating category', {category: category.name});

        const errors = category.validate();
        if (errors.length > 0) {
            logger.warn('Invalid category data', {errors});
            throw new AppError(`Invalid category: ${errors.join(', ')}`, 400);
        }

        try {
            const dbCategory = category.toDatabase();
            const result = await this.db.query(
                'INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING *',
                [dbCategory.id, dbCategory.name]
            );
            const createdCategory = Category.fromDatabase(result.rows[0]);
            logger.info('Created category', {category: createdCategory});
            return createdCategory;
        } catch (error) {
            logger.error('Error creating category', {error: error});
            throw new AppError('Error creating category', 500);
        }
    }

    async updateCategory(id: string, name: string): Promise<Category | null> {
        logger.info('Updating category', {id, name});
        try {
            const result = await this.db.query(
                'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
                [name, id]
            );
            if (result.rows.length === 0) {
                logger.warn('Category not found', {id});
                return null;
            }
            const updatedCategory = Category.fromDatabase(result.rows[0]);
            logger.info('Updated category', {category: updatedCategory});
            return updatedCategory;
        } catch (error) {
            logger.error('Error updating category', {error: error});
            throw new AppError('Error updating category', 500);
        }
    }

    async deleteCategory(id: string): Promise<number | null> {
        logger.info('Deleting category', {id});
        try {
            const result = await this.db.query(
                'DELETE FROM categories WHERE id = $1',
                [id]
            );
            logger.info('Deleted category', {id, rowCount: result.rowCount});
            return result.rowCount;
        } catch (error) {
            logger.error('Error deleting category', {error: error});
            throw new AppError('Error deleting category', 500);
        }
    }
}
