import 'reflect-metadata';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createApp } from '../../../../src/app';
import { Expense } from '../../../../src/models/Expense';
import { DI_TYPES } from '../../../../src/types/di';
import { AppError } from '../../../../src/utils/AppError';
import { createTestContainer } from '../../../testContainer';
import { mockExpenseService, mockHouseholdService } from '../../mocks/serviceMocks';
import { mockUserId, mockHouseholdId } from '../../testUtils';

jest.mock('pg', () => require('../../mocks/pg'));

jest.mock('../../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req, res, next) => next()),
  attachUser: jest.fn((req, res, next) => {
    req.user = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      authProviderId: 'auth0|123456',
    };
    req.currentHouseholdId = mockHouseholdId;
    next();
  }),
}));

const testContainer = createTestContainer();
testContainer.rebind(DI_TYPES.ExpenseService).toConstantValue(mockExpenseService);
testContainer.rebind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
const app = createApp(testContainer);

describe('Expense Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/expenses', () => {
    it('should return all expenses for a household with pagination', async () => {
      const mockExpenses = [
        new Expense('Expense 1', 100, 'Food', 'Groceries', uuidv4(), new Date()),
        new Expense('Expense 2', 200, 'Transport', 'Gas', uuidv4(), new Date()),
      ];

      (mockExpenseService.getExpenses as jest.Mock).mockResolvedValue({
        expenses: mockExpenses,
        totalItems: 10,
      });
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .get('/api/expenses?page=1&limit=10')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expenses');
      expect(response.body.expenses).toHaveLength(2);
      expect(response.body).toHaveProperty('totalItems', 10);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages', 1);
    });

    it('should filter expenses based on query parameters', async () => {
      const queryParams = {
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z',
        category: 'Food',
        subcategory: 'Groceries',
        page: '1',
        limit: '10',
      };

      const mockExpenses = [
        new Expense(
          'Grocery shopping',
          50.0,
          'Food',
          'Groceries',
          uuidv4(),
          new Date('2023-06-15T14:30:00Z')
        ),
        new Expense(
          'Gas station',
          30.5,
          'Transport',
          'Fuel',
          uuidv4(),
          new Date('2023-06-16T10:15:00Z')
        ),
        new Expense(
          'Movie tickets',
          25.0,
          'Entertainment',
          'Cinema',
          uuidv4(),
          new Date('2023-06-17T20:00:00Z')
        ),
      ];

      (mockExpenseService.getExpenses as jest.Mock).mockResolvedValue({
        expenses: mockExpenses,
        totalItems: 15,
      });
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);
      const response = await request(app)
        .get('/api/expenses')
        .query(queryParams)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expenses');
      expect(response.body.expenses).toHaveLength(mockExpenses.length);
      expect(response.body).toHaveProperty('totalItems', 15);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages', 2);
    });
  });

  describe('POST /api/expenses', () => {
    it('should create a new expense', async () => {
      const newExpense = {
        description: 'Test Expense',
        amount: 100,
        category: 'Food',
        subcategory: 'Groceries',
        expenseDatetime: new Date().toISOString(),
      };

      const mockCreatedExpense = new Expense(
        newExpense.description,
        newExpense.amount,
        newExpense.category,
        newExpense.subcategory,
        mockHouseholdId,
        new Date(newExpense.expenseDatetime)
      );

      (mockExpenseService.createExpense as jest.Mock).mockResolvedValue(mockCreatedExpense);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);
      const response = await request(app)
        .post('/api/expenses')
        .send(newExpense)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        description: newExpense.description,
        amount: newExpense.amount,
        category: newExpense.category,
        subcategory: newExpense.subcategory,
      });
    });
  });

  describe('PUT /api/expenses/:id', () => {
    it('should update an existing expense', async () => {
      const expenseId = uuidv4();
      const updatedExpenseData = {
        description: 'Updated Expense',
        amount: 150,
        category: 'Transport',
        subcategory: 'Fuel',
        expenseDatetime: new Date().toISOString(),
      };

      const mockUpdatedExpense = new Expense(
        updatedExpenseData.description,
        updatedExpenseData.amount,
        updatedExpenseData.category,
        updatedExpenseData.subcategory,
        mockHouseholdId,
        new Date(updatedExpenseData.expenseDatetime)
      );

      (mockExpenseService.updateExpense as jest.Mock).mockResolvedValue(mockUpdatedExpense);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);
      const response = await request(app)
        .put(`/api/expenses/${expenseId}`)
        .send(updatedExpenseData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        description: updatedExpenseData.description,
        amount: updatedExpenseData.amount,
        category: updatedExpenseData.category,
        subcategory: updatedExpenseData.subcategory,
      });
    });

    it('should return 404 when expense is not found', async () => {
      const nonExistentExpenseId = uuidv4();
      const updatedExpenseData = {
        description: 'Updated Expense',
        amount: 150,
        category: 'Transport',
        subcategory: 'Fuel',
        expenseDatetime: new Date().toISOString(),
      };

      (mockExpenseService.updateExpense as jest.Mock).mockResolvedValue(null);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/expenses/${nonExistentExpenseId}`)
        .send(updatedExpenseData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Expense not found');
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    it('should delete an expense', async () => {
      const expenseId = uuidv4();

      (mockExpenseService.deleteExpense as jest.Mock).mockResolvedValue(1);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);
      const response = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(204);
    });

    it('should return 404 when expense is not found', async () => {
      const nonExistentExpenseId = uuidv4();

      (mockExpenseService.deleteExpense as jest.Mock).mockRejectedValue(
        new AppError('Expense not found', 404)
      );
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/expenses/${nonExistentExpenseId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Expense not found');
    });
  });
});
