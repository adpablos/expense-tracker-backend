import { CategoryController } from '../../../src/controllers/categoryController';
import { ExpenseController } from '../../../src/controllers/expenseController';
import { HouseholdController } from '../../../src/controllers/householdController';
import { SubcategoryController } from '../../../src/controllers/subcategoryController';
import { UserController } from '../../../src/controllers/userController';

type MockedClassMethods<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? jest.Mock : T[K];
};

export const mockUserController: MockedClassMethods<UserController> = {
  getCurrentUser: jest.fn(),
  registerUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserHouseholds: jest.fn(),
};

export const mockHouseholdController: MockedClassMethods<HouseholdController> = {
  createHousehold: jest.fn(),
  inviteMember: jest.fn(),
  acceptInvitation: jest.fn(),
  rejectInvitation: jest.fn(),
  getHouseholdMembers: jest.fn(),
  removeMember: jest.fn(),
  getUserHouseholds: jest.fn(),
};

export const mockExpenseController: MockedClassMethods<ExpenseController> = {
  getExpenses: jest.fn(),
  addExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
  uploadExpense: jest.fn(),
};

export const mockCategoryController: MockedClassMethods<CategoryController> = {
  getCategories: jest.fn(),
  addCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
};

export const mockSubcategoryController: MockedClassMethods<SubcategoryController> = {
  getSubcategories: jest.fn(),
  addSubcategory: jest.fn(),
  updateSubcategory: jest.fn(),
  deleteSubcategory: jest.fn(),
};
