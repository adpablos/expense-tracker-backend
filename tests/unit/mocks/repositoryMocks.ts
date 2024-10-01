import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { ExpenseRepository } from '../../../src/repositories/expenseRepository';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { SubcategoryRepository } from '../../../src/repositories/subcategoryRepository';
import { UserRepository } from '../../../src/repositories/userRepository';

type MockedClassMethods<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? jest.Mock : T[K];
};

export const mockUserRepository: MockedClassMethods<UserRepository> = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  getUserById: jest.fn(),
  deleteUser: jest.fn(),
  getUserByAuthProviderId: jest.fn(),
  removeUserFromAllHouseholds: jest.fn(),
  createUserWithClient: jest.fn(),
  updateUserWithClient: jest.fn(),
};

export const mockHouseholdRepository: MockedClassMethods<HouseholdRepository> = {
  create: jest.fn(),
  getHouseholdById: jest.fn(),
  isMember: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  getMembers: jest.fn(),
  updateMemberStatus: jest.fn(),
  getUserHouseholds: jest.fn(),
  getDefaultHouseholdForUser: jest.fn(),
  deleteOrphanedHousehold: jest.fn(),
  transferHouseholdOwnership: jest.fn(),
  createWithClient: jest.fn(),
  addMemberWithClient: jest.fn(),
  getMember: jest.fn(),
};

export const mockCategoryRepository: MockedClassMethods<CategoryRepository> = {
  getAllCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  deleteSubcategoriesByCategoryId: jest.fn(),
  getCategoryById: jest.fn(),
};

export const mockExpenseRepository: MockedClassMethods<ExpenseRepository> = {
  getExpenses: jest.fn(),
  createExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
  getExpenseById: jest.fn(),
};

export const mockSubcategoryRepository: MockedClassMethods<SubcategoryRepository> = {
  getAllSubcategories: jest.fn(),
  createSubcategory: jest.fn(),
  updateSubcategory: jest.fn(),
  deleteSubcategory: jest.fn(),
  getSubcategoryById: jest.fn(),
  getSubcategoriesByCategoryId: jest.fn(),
};
