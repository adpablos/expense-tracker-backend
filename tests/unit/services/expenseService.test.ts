import { ExpenseService } from '../../../src/services/expenseService';
import { Expense } from '../../../src/models/Expense';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../src/utils/AppError';
import { NotificationService } from '../../../src/services/external/notificationService';

jest.mock('pg');
jest.mock('../../../config/logger');
jest.mock('../../../services/external/notificationService');
jest.mock('../../../config/db', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        connect: jest.fn().mockResolvedValue({
            query: jest.fn(),
            release: jest.fn(),
        }),
    },
}));

describe('ExpenseService', () => {
    let expenseService: ExpenseService;
    let mockPool: jest.Mocked<Pool>;
    let mockNotificationService: jest.Mocked<NotificationService>;

    beforeEach(() => {
        mockPool = {
            query: jest.fn(),
        } as unknown as jest.Mocked<Pool>;
        mockNotificationService = {
            notifyHouseholdMembers: jest.fn(),
        } as unknown as jest.Mocked<NotificationService>;
        expenseService = new ExpenseService(mockPool);
        (expenseService as any).notificationService = mockNotificationService;
    });

    describe('getExpenses', () => {
        it('should get expenses with filters and pagination', async () => {
            const householdId = uuidv4();
            const mockExpenses = [
                { id: uuidv4(), description: 'Expense 1', amount: 100, category: 'Food', subcategory: 'Groceries', expense_datetime: new Date(), household_id: householdId },
                { id: uuidv4(), description: 'Expense 2', amount: 200, category: 'Transport', subcategory: 'Gas', expense_datetime: new Date(), household_id: householdId },
            ];

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockExpenses });
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '2' }] });

            const filters = {
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-12-31'),
                category: 'Food',
                subcategory: 'Groceries',
                amount: 100,
                description: 'Expense',
                householdId,
                page: 1,
                limit: 10
            };

            const result = await expenseService.getExpenses(filters);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
            expect(result.expenses).toHaveLength(2);
            expect(result.expenses[0]).toBeInstanceOf(Expense);
            expect(result.totalItems).toBe(2);
        });
    });

    describe('createExpense', () => {
        it('should create a new expense', async () => {
            const newExpense = new Expense(
                'New Expense',
                100,
                'Food',
                'Groceries',
                uuidv4(),
                new Date()
            );
            const mockDbResult = { ...newExpense.toDatabase(), id: uuidv4() };

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDbResult] });

            const result = await expenseService.createExpense(newExpense, uuidv4());

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/INSERT INTO expenses[\s\S]+VALUES[\s\S]+RETURNING \*/),
                expect.arrayContaining([
                    newExpense.id,
                    newExpense.description,
                    newExpense.amount,
                    newExpense.category,
                    newExpense.subcategory,
                    newExpense.expenseDatetime,
                    newExpense.householdId
                ])
            );
            expect(result).toBeInstanceOf(Expense);
            expect(result.description).toBe(newExpense.description);
            expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalled();
        });

        it('should throw an error for invalid expense data', async () => {
            const invalidExpense = new Expense(
                '',  // Invalid: empty description
                -100,  // Invalid: negative amount
                'Food',
                'Groceries',
                uuidv4(),
                new Date()
            );

            await expect(expenseService.createExpense(invalidExpense, uuidv4()))
                .rejects
                .toThrow(AppError);
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
                expenseDatetime: new Date()
            };

            const mockExistingExpense = new Expense(
                'Original Expense',
                100,
                'Food',
                'Groceries',
                householdId,
                new Date('2023-01-01'),
                new Date('2023-01-01'),
                new Date('2023-01-01'),
                expenseId
            );

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockExistingExpense.toDatabase()] });
            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ ...mockExistingExpense.toDatabase(), ...updatedData }] });

            const result = await expenseService.updateExpense(expenseId, updatedData, householdId, userId);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
            expect(result).toBeInstanceOf(Expense);
            expect(result.description).toBe(updatedData.description);
            expect(result.amount).toBe(updatedData.amount);
            expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalled();
        });

        it('should throw an error when updating a non-existent expense', async () => {
            const expenseId = uuidv4();
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

            await expect(expenseService.updateExpense(expenseId, {}, householdId, userId))
                .rejects
                .toThrow('Expense not found');
        });
    });

    describe('deleteExpense', () => {
        it('should delete an existing expense', async () => {
            const expenseId = uuidv4();
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

            await expenseService.deleteExpense(expenseId, householdId, userId);

            expect(mockPool.query).toHaveBeenCalledWith(
                'DELETE FROM expenses WHERE id = $1 AND household_id = $2 RETURNING *',
                [expenseId, householdId]
            );
            expect(mockNotificationService.notifyHouseholdMembers).toHaveBeenCalled();
        });

        it('should throw an error when deleting a non-existent expense', async () => {
            const expenseId = uuidv4();
            const householdId = uuidv4();
            const userId = uuidv4();

            (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

            await expect(expenseService.deleteExpense(expenseId, householdId, userId))
                .rejects
                .toThrow('Expense not found');
        });
    });
});