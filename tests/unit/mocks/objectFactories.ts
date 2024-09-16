// tests/unit/mocks/objectFactories.ts

import { Expense } from '../../../src/models/Expense';

export const createMockExpense = (overrides?: Partial<Expense>): Expense => ({
  id: 'expense-id',
  description: 'Test Audio Expense',
  amount: 150,
  category: 'Transport',
  subcategory: 'Fuel',
  expenseDatetime: new Date(),
  householdId: 'household-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  toDatabase: jest.fn(),
  validate: jest.fn(),
  ...overrides,
});
