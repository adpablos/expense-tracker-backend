import { Pool } from 'pg';
import { Subcategory } from '../models/Subcategory';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

export class SubcategoryService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getAllSubcategories(): Promise<Subcategory[]> {
        logger.info('Fetching all subcategories');
        try {
            const result = await this.db.query('SELECT * FROM subcategories');
            const subcategories = result.rows.map(Subcategory.fromDatabase);
            logger.info('Fetched subcategories', { count: subcategories.length });
            return subcategories;
        } catch (error) {
            logger.error('Error fetching subcategories', { error: error });
            throw new AppError('Error fetching subcategories', 500);
        }
    }

    async createSubcategory(subcategory: Subcategory): Promise<Subcategory> {
        logger.info('Creating subcategory', { subcategory: subcategory.name });

        const errors = subcategory.validate();
        if (errors.length > 0) {
            logger.warn('Invalid subcategory data', { errors });
            throw new AppError(`Invalid subcategory: ${errors.join(', ')}`, 400);
        }

        try {
            const dbSubcategory = subcategory.toDatabase();
            const result = await this.db.query(
                'INSERT INTO subcategories (id, name, category_id) VALUES ($1, $2, $3) RETURNING *',
                [dbSubcategory.id, dbSubcategory.name, dbSubcategory.category_id]
            );
            const createdSubcategory = Subcategory.fromDatabase(result.rows[0]);
            logger.info('Created subcategory', { subcategory: createdSubcategory });
            return createdSubcategory;
        } catch (error) {
            logger.error('Error creating subcategory', { error: error });
            throw new AppError('Error creating subcategory', 500);
        }
    }

    async updateSubcategory(id: string, name: string, categoryId: string): Promise<Subcategory | null> {
        logger.info('Updating subcategory', { id, name, categoryId });
        try {
            const result = await this.db.query(
                'UPDATE subcategories SET name = $1, category_id = $2 WHERE id = $3 RETURNING *',
                [name, categoryId, id]
            );
            if (result.rows.length === 0) {
                logger.warn('Subcategory not found', { id });
                return null;
            }
            const updatedSubcategory = Subcategory.fromDatabase(result.rows[0]);
            logger.info('Updated subcategory', { subcategory: updatedSubcategory });
            return updatedSubcategory;
        } catch (error) {
            logger.error('Error updating subcategory', { error: error });
            throw new AppError('Error updating subcategory', 500);
        }
    }

    async deleteSubcategory(id: string): Promise<number | null> {
        logger.info('Deleting subcategory', { id });
        try {
            const result = await this.db.query('DELETE FROM subcategories WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                logger.warn('Subcategory not found', { id });
                return null;
            }
            logger.info('Deleted subcategory', { id, rowCount: result.rowCount });
            return result.rowCount;
        } catch (error) {
            logger.error('Error deleting subcategory', { error: error });
            throw new AppError('Error deleting subcategory', 500);
        }
    }
}
