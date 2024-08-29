import { Pool } from 'pg';

import logger from '../config/logger';
import { Expense } from '../models/Expense';
import { AppError } from '../utils/AppError';

import { NotificationService } from './external/notificationService';

interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  subcategory?: string;
  amount?: number;
  description?: string;
  householdId: string;
  page: number;
  limit: number;
}

type ExpenseQueryParam = string | number | Date;

export class ExpenseService {
  private db: Pool;
  private notificationService: NotificationService;

  constructor(db: Pool) {
    this.db = db;
    this.notificationService = new NotificationService();
  }

  async getExpenses(filters: ExpenseFilters): Promise<{ expenses: Expense[]; totalItems: number }> {
    logger.info('Fetching expenses', { filters });
    try {
      const {
        startDate,
        endDate,
        page,
        limit,
        category,
        subcategory,
        amount,
        description,
        householdId,
      } = filters;
      const offset = (page - 1) * limit;
      const params: ExpenseQueryParam[] = [householdId];
      const conditions: string[] = ['household_id = $1'];
      let paramIndex = 2;

      // Add optional filters to the SQL query
      if (startDate) {
        conditions.push(`expense_datetime >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`expense_datetime <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (category) {
        conditions.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (subcategory) {
        conditions.push(`subcategory = $${paramIndex}`);
        params.push(subcategory);
        paramIndex++;
      }

      if (amount) {
        conditions.push(`amount = $${paramIndex}`);
        params.push(amount);
        paramIndex++;
      }

      if (description) {
        conditions.push(`description ILIKE $${paramIndex}`);
        params.push(`%${description}%`);
        paramIndex++;
      }

      if (householdId) {
        conditions.push(`household_id = $${paramIndex}`);
        params.push(householdId);
        paramIndex++;
      }

      // Build the final SQL query
      let query = 'SELECT * FROM expenses';
      let countQuery = 'SELECT COUNT(*) FROM expenses';

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      query += ` ORDER BY expense_datetime DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);
      const countResult = await this.db.query(countQuery, params.slice(0, paramIndex - 1));
      const totalItems = parseInt(countResult.rows[0].count, 10);
      logger.info('Fetched expenses', { count: result.rows.length, totalItems });
      return { expenses: result.rows.map(Expense.fromDatabase), totalItems };
    } catch (error) {
      logger.error('Error fetching expenses', { error });
      throw new AppError('Error fetching expenses', 500);
    }
  }

  async createExpense(expense: Expense, userId: string): Promise<Expense> {
    logger.info('Creating expense', { expense: expense.description });
    const errors = expense.validate();
    if (errors.length > 0) {
      logger.warn('Invalid expense data', { errors });
      throw new AppError(`Invalid expense: ${errors.join(', ')}`, 400);
    }
    try {
      const dbExpense = expense.toDatabase();
      const result = await this.db.query(
        `INSERT INTO expenses (id, description, amount, category, subcategory, expense_datetime, created_at,
                                       updated_at, household_id)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)
                 RETURNING *`,
        [
          dbExpense.id,
          dbExpense.description,
          dbExpense.amount,
          dbExpense.category,
          dbExpense.subcategory,
          dbExpense.expense_datetime,
          dbExpense.household_id,
        ]
      );
      const createdExpense = Expense.fromDatabase(result.rows[0]);
      logger.info('Created expense', { expense: createdExpense });

      // Notify household members about the new expense
      await this.notificationService.notifyHouseholdMembers(
        expense.householdId,
        `Nuevo gasto creado: ${expense.description} - ${expense.amount}`,
        userId
      );
      return createdExpense;
    } catch (error) {
      logger.error('Error creating expense', { error });
      throw new AppError('Error creating expense', 500);
    }
  }

  async updateExpense(
    id: string,
    expenseData: Partial<Expense>,
    householdId: string,
    userId: string
  ): Promise<Expense> {
    logger.info('Updating expense', { id, expenseData, householdId });
    try {
      const currentExpense = await this.getExpenseById(id, householdId);
      if (!currentExpense) {
        logger.warn('Expense not found', { id, householdId });
        throw new AppError('Expense not found', 404);
      }

      const updatedExpense = new Expense(
        expenseData.description || currentExpense.description,
        expenseData.amount || currentExpense.amount,
        expenseData.category || currentExpense.category,
        expenseData.subcategory || currentExpense.subcategory,
        householdId,
        expenseData.expenseDatetime
          ? new Date(expenseData.expenseDatetime)
          : currentExpense.expenseDatetime,
        currentExpense.createdAt,
        new Date(),
        id
      );

      const errors = updatedExpense.validate();
      if (errors.length > 0) {
        logger.warn('Invalid expense data', { errors });
        throw new AppError(`Invalid expense: ${errors.join(', ')}`, 400);
      }

      const dbExpense = updatedExpense.toDatabase();
      const result = await this.db.query(
        `UPDATE expenses
                 SET description = $1,
                     amount = $2,
                     category = $3,
                     subcategory = $4,
                     expense_datetime = $5,
                     updated_at = $6
                 WHERE id = $7
                   AND household_id = $8
                 RETURNING *`,
        [
          dbExpense.description,
          dbExpense.amount,
          dbExpense.category,
          dbExpense.subcategory,
          dbExpense.expense_datetime,
          dbExpense.updated_at,
          id,
          householdId,
        ]
      );
      if (result.rows.length === 0) {
        logger.warn('Expense not found after update', { id, householdId });
        throw new AppError('Expense not found', 404);
      }

      const updatedExpenseData = Expense.fromDatabase(result.rows[0]);
      logger.info('Updated expense', { expense: updatedExpenseData });

      // Notify household members about the updated expense
      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Gasto actualizado: ${updatedExpenseData.description} - ${updatedExpenseData.amount}`,
        userId
      );

      return updatedExpenseData;
    } catch (error) {
      logger.error('Error updating expense', { error, householdId });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating expense', 500);
    }
  }

  async deleteExpense(id: string, householdId: string, userId: string): Promise<void> {
    logger.info('Deleting expense', { id, householdId });
    try {
      const result = await this.db.query(
        'DELETE FROM expenses WHERE id = $1 AND household_id = $2 RETURNING *',
        [id, householdId]
      );
      if (result.rowCount === 0) {
        logger.warn('Expense not found', { id, householdId });
        throw new AppError('Expense not found', 404);
      }
      logger.info('Deleted expense', { id, householdId });
      await this.notificationService.notifyHouseholdMembers(
        householdId,
        `Gasto eliminado: ID ${id}`,
        userId
      );
    } catch (error) {
      logger.error('Error deleting expense', { error, householdId });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting expense', 500);
    }
  }

  private async getExpenseById(id: string, householdId: string): Promise<Expense | null> {
    logger.info('Fetching expense by ID', { id, householdId });
    try {
      const result = await this.db.query(
        'SELECT * FROM expenses WHERE id = $1 AND household_id = $2',
        [id, householdId]
      );
      const expense = result.rows[0] ? Expense.fromDatabase(result.rows[0]) : null;
      logger.info('Fetched expense by ID', { id, householdId, found: !!expense });
      return expense;
    } catch (error) {
      logger.error('Error fetching expense by ID', { error: error, householdId });
      throw new AppError('Error fetching expense', 500);
    }
  }
}
