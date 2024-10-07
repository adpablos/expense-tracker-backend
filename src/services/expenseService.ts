import { injectable, inject } from 'inversify';

import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { Expense } from '../models/Expense';
import { ExpenseRepository } from '../repositories/expenseRepository';
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

@injectable()
export class ExpenseService {
  constructor(
    @inject(DI_TYPES.ExpenseRepository) private expenseRepository: ExpenseRepository,
    @inject(DI_TYPES.NotificationService) private notificationService: NotificationService
  ) {}

  async getExpenses(filters: ExpenseFilters): Promise<{ expenses: Expense[]; totalItems: number }> {
    return this.expenseRepository.getExpenses(filters);
  }

  async createExpense(expense: Expense, userId: string): Promise<Expense> {
    logger.info('Creating expense', { expense: expense.description });
    const errors = expense.validate();
    if (errors.length > 0) {
      logger.warn('Invalid expense data', { errors });
      throw new AppError(`Invalid expense: ${errors.join(', ')}`, 400);
    }

    const createdExpense = await this.expenseRepository.createExpense(expense);

    // Notify household members about the new expense
    await this.notificationService.notifyHouseholdMembers(
      expense.householdId,
      `Nuevo gasto creado: ${expense.description} - ${expense.amount}`,
      userId
    );

    return createdExpense;
  }

  async updateExpense(
    id: string,
    expenseData: Partial<Expense>,
    householdId: string,
    userId: string
  ): Promise<Expense> {
    logger.info('Updating expense', { id, expenseData, householdId });

    const currentExpense = await this.expenseRepository.getExpenseById(id, householdId);
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

    const updatedExpenseData = await this.expenseRepository.updateExpense(
      id,
      updatedExpense,
      householdId
    );

    // Notify household members about the updated expense
    await this.notificationService.notifyHouseholdMembers(
      householdId,
      `Gasto actualizado: ${updatedExpenseData.description} - ${updatedExpenseData.amount}`,
      userId
    );

    return updatedExpenseData;
  }

  async deleteExpense(id: string, householdId: string, userId: string): Promise<void> {
    await this.expenseRepository.deleteExpense(id, householdId);
    await this.notificationService.notifyHouseholdMembers(
      householdId,
      `Gasto eliminado: ID ${id}`,
      userId
    );
  }
}
