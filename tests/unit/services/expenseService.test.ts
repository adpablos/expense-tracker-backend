import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';

import { Expense } from '../../../src/models/Expense';
import { ExpenseRepository } from '../../../src/repositories/expenseRepository';
import { ExpenseService } from '../../../src/services/expenseService';
import { NotificationService } from '../../../src/services/external/notificationService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/expenseRepository');
jest.mock('../../../src/services/external/notificationService');
jest.mock('../../../src/config/logger');

describe('ExpenseService', () => {
  let expenseService: ExpenseService;
  let mockExpenseRepository: jest.Mocked<ExpenseRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockExpenseRepository = {
      getExpenses: jest.fn(),
      createExpense: jest.fn(),
      updateExpense: jest.fn(),
      deleteExpense: jest.fn(),
      getExpenseById: jest.fn(),
    } as unknown as jest.Mocked<ExpenseRepository>;

    mockNotificationService = {
      notifyHouseholdMembers: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    expenseService = new ExpenseService(mockExpenseRepository, mockNotificationService);
  });

  describe('getExpenses', () => {
    it('should get expenses with filters and pagination', async () => {
      const householdId = uuidv4();
      const mockExpenses = [
        new Expense('Expense 1', 100, 'Food', 'Groceries', householdId, new Date()),
        new Expense('Expense 2', 200, 'Transport', 'Gas', householdId, new Date()),
      ];

      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        category: 'Food',
        subcategory: 'Groceries',
        amount: 100,
        description: 'Expense',
        householdId,
        page: 1,
        limit: 10,
      };

      mockExpenseRepository.getExpenses.mockResolvedValue({
        expenses: mockExpenses,
        totalItems: 2,
      });

      const result = await expenseService.getExpenses(filters);

      expect(result.expenses).toHaveLength(2);
      expect(result.expenses[0]).toBeInstanceOf(Expense);
      expect(result.totalItems).toBe(2);
      expect(mockExpenseRepository.getExpenses).toHaveBeenCalledWith(filters);
    });
  });

  describe('createExpense', () => {
    it('should create a new expense', async () => {
      const newExpense = new Expense('New Expense', 100, 'Food', 'Groceries', uuidv4(), new Date());
      const createdExpense = new Expense(
        'New Expense',
        100,
        'Food',
        'Groceries',
        newExpense.householdId,
        new Date(),
        new Date(),
        new Date(),
        uuidv4()
      );

      mockExpenseRepository.createExpense.mockResolvedValue(createdExpense);

      const result = await expenseService.createExpense(newExpense, uuidv4());

      expect(result).toEqual(createdExpense);
      expect(mockExpenseRepository.createExpense).toHaveBeenCalledWith(newExpense);
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        newExpense.householdId,
        expect.stringContaining('Nuevo gasto creado:'),
        expect.any(String)
      );
    });

    it('should throw an error for invalid expense data', async () => {
      const invalidExpense = new Expense('', -100, 'Food', 'Groceries', uuidv4(), new Date());
      await expect(expenseService.createExpense(invalidExpense, uuidv4())).rejects.toThrow(
        AppError
      );
    });
  });

  describe('updateExpense', () => {
    it('should update an existing expense', async () => {
      const expenseId = uuidv4();
      const householdId = uuidv4();
      const userId = uuidv4();
      const updatedData = {
        description: 'Updated Expense',
        amount: 150,
        category: 'Transport',
        subcategory: 'Gas',
        expenseDatetime: new Date(),
      };

      const existingExpense = new Expense(
        'Original Expense',
        100,
        'Food',
        'Groceries',
        householdId,
        new Date(),
        new Date(),
        new Date(),
        expenseId
      );
      const updatedExpense = new Expense(
        updatedData.description,
        updatedData.amount,
        updatedData.category,
        updatedData.subcategory,
        householdId,
        updatedData.expenseDatetime,
        existingExpense.createdAt,
        new Date(),
        expenseId
      );

      mockExpenseRepository.getExpenseById.mockResolvedValue(existingExpense);
      mockExpenseRepository.updateExpense.mockResolvedValue(updatedExpense);

      const result = await expenseService.updateExpense(
        expenseId,
        updatedData,
        householdId,
        userId
      );

      expect(result).toEqual(updatedExpense);
      expect(mockExpenseRepository.updateExpense).toHaveBeenCalledWith(
        expenseId,
        expect.any(Expense),
        householdId
      );
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        householdId,
        expect.stringContaining('Gasto actualizado:'),
        userId
      );
    });

    it('should throw an error when updating a non-existent expense', async () => {
      const expenseId = uuidv4();
      const householdId = uuidv4();
      const userId = uuidv4();

      mockExpenseRepository.getExpenseById.mockResolvedValue(null);

      await expect(
        expenseService.updateExpense(expenseId, {}, householdId, userId)
      ).rejects.toThrow('Expense not found');
    });
  });

  describe('deleteExpense', () => {
    it('should delete an existing expense', async () => {
      const expenseId = uuidv4();
      const householdId = uuidv4();
      const userId = uuidv4();

      mockExpenseRepository.deleteExpense.mockResolvedValue();

      await expenseService.deleteExpense(expenseId, householdId, userId);

      expect(mockExpenseRepository.deleteExpense).toHaveBeenCalledWith(expenseId, householdId);
      expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalledWith(
        householdId,
        expect.stringContaining('Gasto eliminado:'),
        userId
      );
    });

    it('should throw an error when deleting a non-existent expense', async () => {
      const expenseId = uuidv4();
      const householdId = uuidv4();
      const userId = uuidv4();

      mockExpenseRepository.deleteExpense.mockRejectedValue(new AppError('Expense not found', 404));

      await expect(expenseService.deleteExpense(expenseId, householdId, userId)).rejects.toThrow(
        'Expense not found'
      );
    });
  });
});
