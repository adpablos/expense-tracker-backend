import {Pool} from 'pg';
import {Expense} from '../models/Expense';
import {AppError} from '../utils/AppError';
import logger from '../config/logger';

interface ExpenseFilters {
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
}

export class ExpenseService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async getExpenses(filters: ExpenseFilters): Promise<{ expenses: Expense[], totalItems: number }> {
        logger.info('Fetching expenses', {filters});

        const {startDate, endDate, page, limit} = filters;
        const offset = (page - 1) * limit;
        const params: any[] = [limit, offset];
        const countParams: any[] = [];
        let query = 'SELECT * FROM expenses';
        let countQuery = 'SELECT COUNT(*) FROM expenses';

        if (startDate || endDate) {
            query += ' WHERE';
            countQuery += ' WHERE';
            if (startDate) {
                query += ' date >= $3';
                countQuery += ' date >= $1';
                params.push(startDate);
                countParams.push(startDate);
            }
            if (endDate) {
                query += (startDate ? ' AND' : '') + ' date <= $4';
                countQuery += (startDate ? ' AND' : '') + ' date <= $2';
                params.push(endDate);
                countParams.push(endDate);
            }
        }

        query += ' ORDER BY date DESC LIMIT $1 OFFSET $2';

        try {
            const result = await this.db.query(query, params);
            const countResult = await this.db.query(countQuery, countParams);
            const totalItems = parseInt(countResult.rows[0].count, 10);
            logger.info('Fetched expenses', {count: result.rows.length, totalItems});
            return {expenses: result.rows.map(Expense.fromDatabase), totalItems};
        } catch (error) {
            logger.error('Error fetching expenses', {error: error});
            throw new AppError('Error fetching expenses', 500);
        }
    }

    async createExpense(expense: Expense): Promise<Expense> {
        logger.info('Creating expense', {expense: expense.description});
        const errors = expense.validate();
        if (errors.length > 0) {
            logger.warn('Invalid expense data', {errors});
            throw new AppError(`Invalid expense: ${errors.join(', ')}`, 400);
        }

        try {
            const dbExpense = expense.toDatabase();
            const result = await this.db.query(
                'INSERT INTO expenses (id, description, amount, category, subcategory, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [dbExpense.id, dbExpense.description, dbExpense.amount, dbExpense.category, dbExpense.subcategory, dbExpense.date]
            );
            const createdExpense = Expense.fromDatabase(result.rows[0]);
            logger.info('Created expense', {expense: createdExpense});
            return createdExpense;
        } catch (error) {
            logger.error('Error creating expense', {error: error});
            throw new AppError('Error creating expense', 500);
        }
    }

    async updateExpense(id: string, expenseData: Partial<Expense>): Promise<Expense> {
        logger.info('Updating expense', {id, expenseData});
        const currentExpense = await this.getExpenseById(id);
        if (!currentExpense) {
            logger.warn('Expense not found', {id});
            throw new AppError('Expense not found', 404);
        }

        const updatedExpense = new Expense(
            expenseData.description || currentExpense.description,
            expenseData.amount || currentExpense.amount,
            expenseData.category || currentExpense.category,
            expenseData.subcategory || currentExpense.subcategory,
            expenseData.date ? new Date(expenseData.date) : currentExpense.date,
            id
        );

        const errors = updatedExpense.validate();
        if (errors.length > 0) {
            logger.warn('Invalid expense data', {errors});
            throw new AppError(`Invalid expense: ${errors.join(', ')}`, 400);
        }

        try {
            const dbExpense = updatedExpense.toDatabase();
            const result = await this.db.query(
                'UPDATE expenses SET description = $1, amount = $2, category = $3, subcategory = $4, date = $5 WHERE id = $6 RETURNING *',
                [dbExpense.description, dbExpense.amount, dbExpense.category, dbExpense.subcategory, dbExpense.date, id]
            );
            if (result.rows.length === 0) {
                logger.warn('Expense not found after update', {id});
                throw new AppError('Expense not found', 404);
            }
            const updatedExpenseData = Expense.fromDatabase(result.rows[0]);
            logger.info('Updated expense', {expense: updatedExpenseData});
            return updatedExpenseData;
        } catch (error) {
            logger.error('Error updating expense', {error: error});
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating expense', 500);
        }
    }

    async deleteExpense(id: string): Promise<void> {
        logger.info('Deleting expense', {id});
        try {
            const result = await this.db.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                logger.warn('Expense not found', {id});
                throw new AppError('Expense not found', 404);
            }
            logger.info('Deleted expense', {id});
        } catch (error) {
            logger.error('Error deleting expense', {error: error});
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting expense', 500);
        }
    }

    private async getExpenseById(id: string): Promise<Expense | null> {
        logger.info('Fetching expense by ID', {id});
        try {
            const result = await this.db.query('SELECT * FROM expenses WHERE id = $1', [id]);
            const expense = result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
            logger.info('Fetched expense by ID', {id, found: !!expense});
            return expense;
        } catch (error) {
            logger.error('Error fetching expense by ID', {error: error});
            throw new AppError('Error fetching expense', 500);
        }
    }
}
