import {Pool} from 'pg';
import {Subcategory} from '../models/Subcategory';
import {AppError} from '../utils/AppError';
import logger from '../config/logger';

export class SubcategoryService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getAllSubcategories(householdId: string): Promise<Subcategory[]> {
        logger.info('Fetching all subcategories for household', { householdId });
        try {
            const result = await this.db.query('SELECT * FROM subcategories WHERE household_id = $1', [householdId]);
            const subcategories = result.rows.map(Subcategory.fromDatabase);
            logger.info('Fetched subcategories', { count: subcategories.length, householdId });
            return subcategories;
        } catch (error) {
            logger.error('Error fetching subcategories', { error: error, householdId });
            throw new AppError('Error fetching subcategories', 500);
        }
    }

    async createSubcategory(subcategory: Subcategory): Promise<Subcategory> {
        logger.info('Creating subcategory', { subcategory: subcategory.name, householdId: subcategory.householdId });

        const errors = subcategory.validate();
        if (errors.length > 0) {
            logger.warn('Invalid subcategory data', { errors });
            throw new AppError(`Invalid subcategory: ${errors.join(', ')}`, 400);
        }

        try {
            const dbSubcategory = subcategory.toDatabase();
            const result = await this.db.query(
                'INSERT INTO subcategories (id, name, category_id, household_id) VALUES ($1, $2, $3, $4) RETURNING *',
                [dbSubcategory.id, dbSubcategory.name, dbSubcategory.category_id, dbSubcategory.household_id]
            );
            const createdSubcategory = Subcategory.fromDatabase(result.rows[0]);
            logger.info('Created subcategory', { subcategory: createdSubcategory });
            return createdSubcategory;
        } catch (error) {
            logger.error('Error creating subcategory', { error: error });
            throw new AppError('Error creating subcategory', 500);
        }
    }

    async updateSubcategory(id: string, name: string, categoryId: string, householdId: string): Promise<Subcategory | null> {
        logger.info('Updating subcategory', {id, name, categoryId, householdId});
        try {
            const result = await this.db.query(
                'UPDATE subcategories SET name = $1, category_id = $2 WHERE id = $3 AND household_id = $4 RETURNING *',
                [name, categoryId, id, householdId]
            );
            if (result.rows.length === 0) {
                logger.warn('Subcategory not found', {id, householdId});
                return null;
            }
            const updatedSubcategory = Subcategory.fromDatabase(result.rows[0]);
            logger.info('Updated subcategory', {subcategory: updatedSubcategory});
            return updatedSubcategory;
        } catch (error) {
            logger.error('Error updating subcategory', {error: error});
            throw new AppError('Error updating subcategory', 500);
        }
    }

    async deleteSubcategory(id: string, householdId: string): Promise<number | null> {
        logger.info('Deleting subcategory', {id, householdId});
        try {
            const result = await this.db.query('DELETE FROM subcategories WHERE id = $1 AND household_id = $2', [id, householdId]);
            if (result.rowCount === 0) {
                logger.warn('Subcategory not found', {id, householdId});
                return null;
            }
            logger.info('Deleted subcategory', {id, householdId, rowCount: result.rowCount});
            return result.rowCount;
        } catch (error) {
            logger.error('Error deleting subcategory', {error: error});
            throw new AppError('Error deleting subcategory', 500);
        }
    }
}
