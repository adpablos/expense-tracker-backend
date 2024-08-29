import { v4 as uuidv4 } from 'uuid';
import { Expense } from "../../../src/models/Expense";

describe('Expense Model', () => {
    const mockDate = new Date('2024-01-01T00:00:00Z');

    it('should create a valid Expense instance', () => {
        const expenseData = {
            description: 'Test Expense',
            amount: 100,
            category: 'Food',
            subcategory: 'Groceries',
            householdId: uuidv4(),
            expenseDatetime: mockDate,
        };

        const expense = new Expense(
            expenseData.description,
            expenseData.amount,
            expenseData.category,
            expenseData.subcategory,
            expenseData.householdId,
            expenseData.expenseDatetime
        );

        expect(expense).toBeInstanceOf(Expense);
        expect(expense.id).toBeDefined();
        expect(expense.description).toBe(expenseData.description);
        expect(expense.amount).toBe(expenseData.amount);
        expect(expense.category).toBe(expenseData.category);
        expect(expense.subcategory).toBe(expenseData.subcategory);
        expect(expense.householdId).toBe(expenseData.householdId);
        expect(expense.expenseDatetime).toEqual(expenseData.expenseDatetime);
    });

    it('should validate an Expense instance', () => {
        const validExpense = new Expense('Valid Expense', 100, 'Food', 'Groceries', uuidv4(), mockDate);
        const invalidExpense = new Expense('', -10, '', '', '', new Date('invalid'));

        expect(validExpense.validate()).toHaveLength(0);
        expect(invalidExpense.validate()).toEqual([
            'Description is required',
            'Amount must be greater than 0',
            'Category is required',
            'Subcategory is required',
            'Invalid expense datetime'
        ]);
    });

    it('should convert to and from database format', () => {
        const expenseData = {
            description: 'Test Expense',
            amount: 100,
            category: 'Food',
            subcategory: 'Groceries',
            householdId: uuidv4(),
            expenseDatetime: mockDate,
        };

        const expense = new Expense(
            expenseData.description,
            expenseData.amount,
            expenseData.category,
            expenseData.subcategory,
            expenseData.householdId,
            expenseData.expenseDatetime
        );

        const dbFormat = expense.toDatabase();

        expect(dbFormat).toHaveProperty('id');
        expect(dbFormat).toHaveProperty('description', expenseData.description);
        expect(dbFormat).toHaveProperty('amount', expenseData.amount);
        expect(dbFormat).toHaveProperty('category', expenseData.category);
        expect(dbFormat).toHaveProperty('subcategory', expenseData.subcategory);
        expect(dbFormat).toHaveProperty('household_id', expenseData.householdId);
        expect(dbFormat).toHaveProperty('expense_datetime', expenseData.expenseDatetime);

        const reconstructedExpense = Expense.fromDatabase(dbFormat);

        expect(reconstructedExpense).toBeInstanceOf(Expense);
        expect(reconstructedExpense.id).toBe(expense.id);
        expect(reconstructedExpense.description).toBe(expense.description);
        expect(reconstructedExpense.amount).toBe(expense.amount);
        expect(reconstructedExpense.category).toBe(expense.category);
        expect(reconstructedExpense.subcategory).toBe(expense.subcategory);
        expect(reconstructedExpense.householdId).toBe(expense.householdId);
        expect(reconstructedExpense.expenseDatetime).toEqual(expense.expenseDatetime);
    });
});