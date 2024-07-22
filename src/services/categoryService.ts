import { Pool } from 'pg';
import { Category } from '../models/Category';
import { AppError } from '../utils/AppError';

export class CategoryService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getAllCategories(): Promise<Category[]> {
        try {
            const result = await this.db.query('SELECT * FROM categories');
            return result.rows.map(Category.fromDatabase);
        } catch (error) {
            throw new AppError('Error fetching categories', 500);
        }
    }

    async createCategory(category: Category): Promise<Category> {
        const errors = category.validate();
        if (errors.length > 0) {
            throw new AppError(`Invalid category: ${errors.join(', ')}`, 400);
        }

        try {
            const dbCategory = category.toDatabase();
            const result = await this.db.query(
                'INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING *',
                [dbCategory.id, dbCategory.name]
            );
            return Category.fromDatabase(result.rows[0]);
        } catch (error) {
            throw new AppError('Error creating category', 500);
        }
    }

    async updateCategory(id: string, name: string): Promise<Category | null> {
        try {
            const result = await this.db.query(
                'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
                [name, id]
            );
            if (result.rows.length === 0) {
                return null;
            }
            return Category.fromDatabase(result.rows[0]);
        } catch (error) {
            throw new AppError('Error updating category', 500);
        }
    }

    async deleteCategory(id: string): Promise<number | null> {
        try {
            const result = await this.db.query(
                'DELETE FROM categories WHERE id = $1',
                [id]
            );
            return result.rowCount;
        } catch (error) {
            throw new AppError('Error deleting category', 500);
        }
    }
}
