import 'reflect-metadata';
import { Pool } from 'pg';

import { Expense } from '../../../src/models/Expense';
import { ExpenseRepository } from '../../../src/repositories/expenseRepository';
import { DI_TYPES } from '../../../src/config/di';
import { AppError } from '../../../src/utils/AppError';
import { createRepositoryTestContainer } from '../../testContainer';

describe('ExpenseRepository', () => {
  let expenseRepository: ExpenseRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const container = createRepositoryTestContainer();
    mockPool = container.get<Pool>(DI_TYPES.DbPool) as jest.Mocked<Pool>;
    expenseRepository = container.get<ExpenseRepository>(DI_TYPES.ExpenseRepository);
    jest.clearAllMocks();
  });

  describe('getExpenses', () => {
    it('should fetch expenses successfully', async () => {
      const mockExpenses = [
        {
          id: 'expense-1',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          subcategory: 'Groceries',
          expense_datetime: new Date(),
          household_id: 'household-1',
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockExpenses });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await expenseRepository.getExpenses({
        householdId: 'household-1',
        page: 1,
        limit: 10,
      });

      expect(result.expenses).toHaveLength(1);
      expect(result.expenses[0]).toBeInstanceOf(Expense);
      expect(result.totalItems).toBe(1);
    });

    it('should throw an AppError if there is a database error', async () => {
      const mockError = new Error('Database error');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(
        expenseRepository.getExpenses({
          householdId: 'household-1',
          page: 1,
          limit: 10,
        })
      ).rejects.toThrow(AppError);

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should apply correctly the optional filters', async () => {
      const filters = {
        householdId: 'household-1',
        page: 1,
        limit: 10,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        category: 'Food',
        subcategory: 'Groceries',
        amount: 50,
        description: 'Grocery',
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await expenseRepository.getExpenses(filters);

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
      expect(result.expenses).toHaveLength(0);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('createExpense', () => {
    it('should create an expense successfully', async () => {
      const expense = new Expense(
        'Test Expense',
        100,
        'Food',
        'Groceries',
        'household-1',
        new Date()
      );
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [expense.toDatabase()],
      });

      const result = await expenseRepository.createExpense(expense);

      expect(result).toBeInstanceOf(Expense);
      expect(result.description).toBe('Test Expense');
    });
  });

  describe('updateExpense', () => {
    it('should update an expense successfully', async () => {
      const expenseId = 'expense-1';
      const householdId = 'household-1';
      const updates = { description: 'Updated Expense', amount: 150 };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: expenseId,
            description: 'Updated Expense',
            amount: 150,
            category: 'Food',
            subcategory: 'Groceries',
            expense_datetime: new Date(),
            household_id: householdId,
          },
        ],
      });
      const result = await expenseRepository.updateExpense(expenseId, updates, householdId);
      expect(result).toBeInstanceOf(Expense);
      expect(result.description).toBe('Updated Expense');
      expect(result.amount).toBe(150);
    });

    it('should throw an error if expense not found', async () => {
      const expenseId = 'non-existent-id';
      const householdId = 'household-1';
      const updates = { description: 'Updated Expense' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      await expect(
        expenseRepository.updateExpense(expenseId, updates, householdId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteExpense', () => {
    it('should delete an expense successfully', async () => {
      const expenseId = 'expense-1';
      const householdId = 'household-1';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      await expect(expenseRepository.deleteExpense(expenseId, householdId)).resolves.not.toThrow();
    });
    it('should throw an error if expense not found', async () => {
      const expenseId = 'non-existent-id';
      const householdId = 'household-1';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      await expect(expenseRepository.deleteExpense(expenseId, householdId)).rejects.toThrow(
        'Expense not found'
      );
    });
  });

  describe('getExpenseById', () => {
    it('should return an expense when it exists', async () => {
      const expenseId = 'expense-1';
      const householdId = 'household-1';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: expenseId,
            description: 'Test Expense',
            amount: 100,
            category: 'Food',
            subcategory: 'Groceries',
            expense_datetime: new Date(),
            household_id: householdId,
          },
        ],
      });
      const result = await expenseRepository.getExpenseById(expenseId, householdId);
      expect(result).toBeInstanceOf(Expense);
      expect(result?.id).toBe(expenseId);
      expect(result?.description).toBe('Test Expense');
    });
    it('should return null when the expense does not exist', async () => {
      const expenseId = 'non-existent-id';
      const householdId = 'household-1';
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await expenseRepository.getExpenseById(expenseId, householdId);
      expect(result).toBeNull();
    });
  });
});
