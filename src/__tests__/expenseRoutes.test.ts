import request from 'supertest';
import express from 'express';
import expenseRoutes from '../routes/expenseRoutes';
import multer from 'multer';
import { ExpenseService } from '../services/expenseService';
import { processReceipt } from '../services/openaiService';

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.json());
app.use('/api/expenses', expenseRoutes);

// Mock OpenAI service
jest.mock('../services/openaiService');

const mockExpense = {
    id: '1',
    description: 'Test expense',
    amount: 100.00,
    category: 'Casa',
    subcategory: 'Mantenimiento',
    date: '2024-07-21'
};

describe('Expense Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new expense', async () => {
        const createExpenseMock = jest.fn().mockResolvedValue(mockExpense);
        ExpenseService.prototype.createExpense = createExpenseMock;

        const res = await request(app)
            .post('/api/expenses')
            .send({
                description: 'Test expense',
                amount: 100.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                date: '2024-07-21'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.id).toEqual(mockExpense.id);
    });

    it('should get all expenses', async () => {
        const getAllExpensesMock = jest.fn().mockResolvedValue([mockExpense]);
        ExpenseService.prototype.getAllExpenses = getAllExpensesMock;

        const res = await request(app).get('/api/expenses');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should update an existing expense', async () => {
        const updateExpenseMock = jest.fn().mockResolvedValue({
            ...mockExpense,
            description: 'Updated test expense'
        });
        ExpenseService.prototype.updateExpense = updateExpenseMock;

        const res = await request(app)
            .put(`/api/expenses/${mockExpense.id}`)
            .send({
                description: 'Updated test expense',
                amount: 150.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                date: '2024-07-21'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('description');
        expect(res.body.description).toEqual('Updated test expense');
    });

    it('should return 404 when trying to update a non-existent expense', async () => {
        const updateExpenseMock = jest.fn().mockResolvedValue(null);
        ExpenseService.prototype.updateExpense = updateExpenseMock;

        const res = await request(app)
            .put('/api/expenses/nonexistentid')
            .send({
                description: 'Non-existent expense',
                amount: 150.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                date: '2024-07-21'
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
                date: 'invalid date'
            });

        expect(res.statusCode).toEqual(400);
    });

    it('should upload a receipt and log an expense', async () => {
        (processReceipt as jest.Mock).mockImplementation(() =>
            Promise.resolve({
                date: '2024-07-21',
                amount: 100.00,
                category: 'Casa',
                subcategory: 'Mantenimiento',
                notes: 'Monthly maintenance fee'
            })
        );

        const createExpenseMock = jest.fn().mockResolvedValue({
            id: '2',
            description: 'Monthly maintenance fee',
            amount: 100.00,
            category: 'Casa',
            subcategory: 'Mantenimiento',
            date: '2024-07-21'
        });

        ExpenseService.prototype.createExpense = createExpenseMock;

        const res = await request(app)
            .post('/api/expenses/upload')
            .attach('receipt', 'path/to/test/receipt.jpg');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Expense logged successfully.');
        expect(res.body.expense).toEqual({
            id: '2',
            description: 'Monthly maintenance fee',
            amount: 100.00,
            category: 'Casa',
            subcategory: 'Mantenimiento',
            date: '2024-07-21'
        });
    });

    it('should return 400 if no file is uploaded', async () => {
        const res = await request(app)
            .post('/api/expenses/upload');

        expect(res.statusCode).toEqual(400);
        expect(res.text).toBe('No file uploaded.');
    });

    it('should return 500 if there is an error processing the image', async () => {
        (processReceipt as jest.Mock).mockImplementation(() =>
            Promise.reject(new Error('Error processing the image'))
        );

        const res = await request(app)
            .post('/api/expenses/upload')
            .attach('receipt', 'path/to/test/receipt.jpg');

        expect(res.statusCode).toEqual(500);
        expect(res.text).toBe('Error processing the image.');
    });
});
