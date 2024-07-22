import { Pool } from 'pg';
import { Subcategory } from '../models/Subcategory';
import { AppError } from '../utils/AppError';

export class SubcategoryService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getAllSubcategories(): Promise<Subcategory[]> {
        try {
            const result = await this.db.query('SELECT * FROM subcategories');
            return result.rows.map(Subcategory.fromDatabase);
        } catch (error) {
            throw new AppError('Error fetching subcategories', 500);
        }
    }

    async createSubcategory(subcategory: Subcategory): Promise<Subcategory> {
        const errors = subcategory.validate();
        if (errors.length > 0) {
            throw new AppError(`Invalid subcategory: ${errors.join(', ')}`, 400);
        }

        try {
            const dbSubcategory = subcategory.toDatabase();
            const result = await this.db.query(
                'INSERT INTO subcategories (id, name, category_id) VALUES ($1, $2, $3) RETURNING *',
                [dbSubcategory.id, dbSubcategory.name, dbSubcategory.category_id]
            );
            return Subcategory.fromDatabase(result.rows[0]);
        } catch (error) {
            throw new AppError('Error creating subcategory', 500);
        }
    }

    async updateSubcategory(id: string, name: string, categoryId: string): Promise<Subcategory | null> {
        try {
            const result = await this.db.query(
                'UPDATE subcategories SET name = $1, category_id = $2 WHERE id = $3 RETURNING *',
                [name, categoryId, id]
            );
            if (result.rows.length === 0) {
                return null;
            }
            return Subcategory.fromDatabase(result.rows[0]);
        } catch (error) {
            throw new AppError('Error updating subcategory', 500);
        }
    }

    async deleteSubcategory(id: string): Promise<number | null> {
        try {
            const result = await this.db.query(
                'DELETE FROM subcategories WHERE id = $1',
                [id]
            );
            return result.rowCount;
        } catch (error) {
            throw new AppError('Error deleting subcategory', 500);
        }
    }
}
