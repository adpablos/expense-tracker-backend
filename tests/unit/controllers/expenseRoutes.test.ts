// tests/unit/controllers/expenseRoutes.test.ts

import 'reflect-metadata';
import fs from 'fs'; // Importar fs primero según eslint import/order

import express from 'express';
import { Container } from 'inversify';
import multer from 'multer';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { DI_TYPES } from '../../../src/config/di';
import { ExpenseController } from '../../../src/controllers/expenseController';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { Expense } from '../../../src/models/Expense'; // Importación añadida
import expenseRoutes from '../../../src/routes/expenseRoutes';
import { AppError } from '../../../src/utils/AppError';
import { encodeImage } from '../../../src/utils/encodeImage';
import { createMockAuthMiddleware, createMockHouseholdMiddleware } from '../mocks/middlewareMocks';
import { mockExpenseService, mockHouseholdService, mockOpenAIService } from '../mocks/serviceMocks';

// Mock encodeImage
jest.mock('../../../src/utils/encodeImage');

// Mock fs para evitar operaciones reales de E/S
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    existsSync: jest.fn(),
  };
});

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedEncodeImage = encodeImage as jest.Mock;

// Definir IDs mock para household y user
const mockHouseholdId = uuidv4();
const mockUserId = uuidv4();

// Mock de middlewares
const mockAuthMiddleware = createMockAuthMiddleware(mockUserId);
const mockHouseholdMiddleware = createMockHouseholdMiddleware(mockHouseholdService);
// Mock FileProcessorFactory
const mockFileProcessorFactory = {
  getProcessor: jest.fn().mockReturnValue({
    canProcess: jest.fn().mockReturnValue(true),
    process: jest.fn().mockResolvedValue({
      description: 'Mocked Expense',
      amount: 100,
      category: 'Mocked Category',
      subcategory: 'Mocked Subcategory',
      expenseDatetime: new Date().toISOString(),
    }),
  }),
};

// Configuración del contenedor de Inversify
const container = new Container();
container.bind(DI_TYPES.ExpenseService).toConstantValue(mockExpenseService);
container.bind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
container.bind(DI_TYPES.AuthMiddleware).toConstantValue(mockAuthMiddleware);
container.bind(DI_TYPES.HouseholdMiddleware).toConstantValue(mockHouseholdMiddleware);
container.bind(DI_TYPES.ExpenseController).to(ExpenseController);
container.bind(DI_TYPES.OpenAIService).toConstantValue(mockOpenAIService);
container.bind(DI_TYPES.FileProcessorFactory).toConstantValue(mockFileProcessorFactory);

// Configurar multer con memoryStorage para pruebas
const testStorage = multer.memoryStorage();

const app = express();
app.use(express.json());
app.use('/api/expenses', expenseRoutes(container, testStorage));
app.use(errorHandler);

describe('Expense Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockReset();

    // Configurar el mock de encodeImage para retornar un string base64 simulado
    mockedEncodeImage.mockReturnValue('mocked-base64-string');

    // Configurar los mocks de fs
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.unlinkSync.mockImplementation(() => {});
    mockedFs.existsSync.mockReturnValue(true);
  });

  describe('GET /api/expenses', () => {
    it('should return 403 when user does not have access to the specified household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });

    it('should return all expenses for a household with pagination', async () => {
      const mockExpenses = [
        new Expense('Expense 1', 100, 'Food', 'Groceries', uuidv4(), new Date()),
        new Expense('Expense 2', 200, 'Transport', 'Gas', uuidv4(), new Date()),
      ];

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.getExpenses.mockResolvedValue({
        expenses: mockExpenses,
        totalItems: 10,
      });

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

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.getExpenses.mockResolvedValue({
        expenses: mockExpenses,
        totalItems: 15,
      });

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

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.createExpense.mockResolvedValue(mockCreatedExpense);

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

    it('should return 403 when user does not have access to the household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/expenses')
        .send({
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          subcategory: 'Groceries',
          expenseDatetime: new Date().toISOString(),
        })
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
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

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.updateExpense.mockResolvedValue(mockUpdatedExpense);

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

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.updateExpense.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/expenses/${nonExistentExpenseId}`)
        .send(updatedExpenseData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Expense not found');
    });

    it('should return 403 when user does not have access to the household', async () => {
      const expenseId = uuidv4();
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .put(`/api/expenses/${expenseId}`)
        .send({
          description: 'Updated Expense',
          amount: 150,
          category: 'Transport',
          subcategory: 'Fuel',
          expenseDatetime: new Date().toISOString(),
        })
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    it('should delete an expense', async () => {
      const expenseId = uuidv4();

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.deleteExpense.mockResolvedValue(1);

      const response = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(204);
    });

    it('should return 404 when expense is not found', async () => {
      const nonExistentExpenseId = uuidv4();

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockExpenseService.deleteExpense.mockRejectedValue(new AppError('Expense not found', 404));

      const response = await request(app)
        .delete(`/api/expenses/${nonExistentExpenseId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Expense not found');
    });

    it('should return 403 when user does not have access to the household', async () => {
      const expenseId = uuidv4();
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });

  describe('POST /api/expenses/upload', () => {
    it('should process a file and create an expense', async () => {
      const mockExpense = {
        description: 'Mocked Expense',
        amount: 100,
        category: 'Mocked Category',
        subcategory: 'Mocked Subcategory',
        expenseDatetime: new Date().toISOString(),
      };

      // Actualiza el mock del FileProcessorFactory para devolver el mockExpense
      (mockFileProcessorFactory.getProcessor as jest.Mock).mockReturnValue({
        process: jest.fn().mockResolvedValue(mockExpense),
      });

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/expenses/upload')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId)
        .attach('file', Buffer.from('mock file content'), {
          filename: 'test.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Expense logged successfully.');
      expect(response.body).toHaveProperty('expense');
      expect(response.body.expense).toMatchObject(mockExpense);
    });

    it('should return 422 if no valid expense is identified from the file', async () => {
      // Actualiza el mock del FileProcessorFactory para devolver null
      (mockFileProcessorFactory.getProcessor as jest.Mock).mockReturnValue({
        process: jest.fn().mockResolvedValue(null),
      });

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/expenses/upload')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId)
        .attach('file', Buffer.from('mock file content'), {
          filename: 'test.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('message', 'No expense logged.');
      expect(response.body).toHaveProperty(
        'details',
        'The file was processed successfully, but no valid expense could be identified.'
      );
    });

    it('should return 400 if no file is provided', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true); // Asegurar acceso

      const response = await request(app)
        .post('/api/expenses/upload')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'No file uploaded');
    });

    it('should return 403 when user does not have access to the household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/expenses/upload')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId)
        .attach('file', Buffer.from('mock file content'), {
          filename: 'test.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });

    it('should return 400 for unsupported file type', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/expenses/upload')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId)
        .attach('file', Buffer.from('mock file content'), {
          filename: 'test.exe',
          contentType: 'application/octet-stream',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Unsupported file type');
    });
  });
});
