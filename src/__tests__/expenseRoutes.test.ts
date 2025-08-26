import request from 'supertest';
import express, { Application } from 'express';
import expenseRoutes from '../routes/expenseRoutes';
import multer from 'multer';
import { ExpenseService } from '../data/expenseService';
import { processReceipt } from '../external/openaiService';
import path from 'path';
import OpenAI from 'openai';

const app: Application = express();
multer({ dest: 'uploads/' });
app.use(express.json());
app.use('/api/expenses', expenseRoutes);

// Mock OpenAI service
jest.mock('../external/openaiService');

const mockExpense = {
    id: '1',
    description: 'Test expense',
    amount: 100.00,
    category: 'Casa',
    subcategory: 'Mantenimiento',
    expenseDatetime: '2024-07-21T00:00:00Z' // Actualización para usar el formato ISO 8601
};

describe('Expense Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new expense', async () => {
        ExpenseService.prototype.createExpense = jest.fn().mockResolvedValue(mockExpense);

        const res = await request(app)
            .post('/api/expenses')
            .send({
                description: 'Test expense',
                amount: 100.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                expenseDatetime: '2024-08-09T13:24:00-04:00'  // Formato ISO 8601
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.id).toEqual(mockExpense.id);
    });

    it('should get all expenses', async () => {
        ExpenseService.prototype.getExpenses = jest.fn().mockResolvedValue({
            expenses: [mockExpense],
            totalItems: 1
        });

        const res = await request(app).get('/api/expenses');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.expenses)).toBeTruthy();
        expect(res.body.expenses.length).toBeGreaterThan(0);
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('totalPages');
        expect(res.body).toHaveProperty('nextPage');
        expect(res.body).toHaveProperty('totalItems');
    });

    it('should get expenses filtered by date range', async () => {
        const mockExpenses = [
            { ...mockExpense, id: '1', expenseDatetime: '2024-07-21T00:00:00Z' },
            { ...mockExpense, id: '2', expenseDatetime: '2024-07-22T00:00:00Z' },
        ];
        ExpenseService.prototype.getExpenses = jest.fn().mockResolvedValue({
            expenses: mockExpenses,
            totalItems: 2
        });

        const res = await request(app)
            .get('/api/expenses')
            .query({ startDate: '2024-07-20T00:00:00Z', endDate: '2024-07-22T23:59:59Z' });  // Fechas en formato ISO 8601

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.expenses)).toBeTruthy();
        expect(res.body.expenses.length).toBe(2);
    });

    it('should get expenses with pagination', async () => {
        const mockExpenses = Array.from({ length: 15 }, (_, i) => ({
            ...mockExpense,
            id: `${i + 1}`,
            expenseDatetime: `2024-07-${21 + i}T00:00:00Z`,  // Fechas en formato ISO 8601
        }));
        ExpenseService.prototype.getExpenses = jest.fn().mockResolvedValue({
            expenses: mockExpenses.slice(0, 10),
            totalItems: 15
        });

        const res = await request(app)
            .get('/api/expenses')
            .query({ page: 1, limit: 10 });

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.expenses)).toBeTruthy();
        expect(res.body.expenses.length).toBe(10);
        expect(res.body.page).toBe(1);
        expect(res.body.totalPages).toBe(2);
        expect(res.body.nextPage).toBe(2);
    });

    it('should return 400 for invalid date format', async () => {
        const res = await request(app)
            .get('/api/expenses')
            .query({ startDate: 'invalid-date' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Invalid startDate format. Please provide the date in ISO 8601 format, such as "2024-08-09T00:00:00Z".');
    });

    it('should return 400 for invalid page number', async () => {
        const res = await request(app)
            .get('/api/expenses')
            .query({ page: 'invalid-page' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Invalid page number. Must be a positive integer.');
    });

    it('should update an existing expense', async () => {
        ExpenseService.prototype.updateExpense = jest.fn().mockResolvedValue({
            ...mockExpense,
            description: 'Updated test expense',
            expenseDatetime: '2024-07-21T00:00:00Z'
        });

        const res = await request(app)
            .put(`/api/expenses/${mockExpense.id}`)
            .send({
                description: 'Updated test expense',
                amount: 150.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                expenseDatetime: '2024-07-21T00:00:00Z'  // Formato ISO 8601
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('description');
        expect(res.body.description).toEqual('Updated test expense');
    });

    it('should return 404 when trying to update a non-existent expense', async () => {
        ExpenseService.prototype.updateExpense = jest.fn().mockResolvedValue(null);

        const res = await request(app)
            .put('/api/expenses/nonexistentid')
            .send({
                description: 'Non-existent expense',
                amount: 150.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                expenseDatetime: '2024-07-21T00:00:00Z'  // Formato ISO 8601
            });

        expect(res.statusCode).toEqual(404);
    });

    it('should return 400 when creating an expense with invalid data', async () => {
        const res = await request(app)
            .post('/api/expenses')
            .send({
                description: '',
                amount: -10,
                category: '',
                subcategory: '',
                expenseDatetime: 'invalid date'  // Formato incorrecto
            });

        expect(res.statusCode).toEqual(400);
    });

    it('should upload a receipt and log an expense', async () => {
        (processReceipt as jest.Mock).mockResolvedValue({
            id: '2',
            description: 'Monthly maintenance fee',
            amount: 100.00,
            category: 'Casa',
            subcategory: 'Mantenimiento',
            expenseDatetime: '2024-07-21T00:00:00Z'
        });

        const res = await request(app)
            .post('/api/expenses/upload')
            .attach('file', path.join(__dirname, 'fixtures', 'receipt.jpg'));

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Expense logged successfully.');
        expect(res.body.expense).toEqual({
            id: '2',
            description: 'Monthly maintenance fee',
            amount: 100.00,
            category: 'Casa',
            subcategory: 'Mantenimiento',
            expenseDatetime: '2024-07-21T00:00:00Z'  // Fecha en formato ISO 8601
        });
    });

    it('should return 400 if no file is uploaded', async () => {
        const res = await request(app)
            .post('/api/expenses/upload');

        expect(res.statusCode).toEqual(400);
        expect(res.text).toBe('No file uploaded.');
    });

    it('should return 503 if OpenAI service is unavailable', async () => {
        (processReceipt as jest.Mock).mockRejectedValue(
            new OpenAI.APIConnectionError({ message: 'Connection error' })
        );

        const res = await request(app)
            .post('/api/expenses/upload')
            .attach('file', path.join(__dirname, 'fixtures', 'receipt.jpg'));

        expect(res.statusCode).toEqual(503);
        expect(res.text).toBe('OpenAI service is currently unavailable');
    });
});
