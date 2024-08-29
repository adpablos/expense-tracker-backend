import { CategoryService } from '../../../src/services/categoryService';
import { ExpenseService } from '../../../src/services/expenseService';
import { NotificationService } from '../../../src/services/external/notificationService';
import { HouseholdService } from '../../../src/services/householdService';
import { SubcategoryService } from '../../../src/services/subcategoryService';
import { UserService } from '../../../src/services/userService';

type MockedClassMethods<T> = {
  [K in keyof T]: T[K] extends Function ? jest.Mock : T[K];
};

export const mockUserService: MockedClassMethods<UserService> = {
  getUserByAuthProviderId: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
  createUserWithHousehold: jest.fn(),
  getUserById: jest.fn(),
};

export const mockHouseholdService: MockedClassMethods<HouseholdService> = {
  createHousehold: jest.fn(),
  getUserHouseholds: jest.fn(),
  getHouseholdById: jest.fn(),
  inviteMember: jest.fn(),
  acceptInvitation: jest.fn(),
  rejectInvitation: jest.fn(),
  getHouseholdMembers: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn(),
  userHasAccessToHousehold: jest.fn(),
  getDefaultHouseholdForUser: jest.fn(),
};

export const mockCategoryService: MockedClassMethods<CategoryService> = {
  getAllCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  deleteSubcategoriesByCategoryId: jest.fn(),
};

export const mockSubcategoryService: MockedClassMethods<SubcategoryService> = {
  getAllSubcategories: jest.fn(),
  createSubcategory: jest.fn(),
  updateSubcategory: jest.fn(),
  deleteSubcategory: jest.fn(),
};

export const mockExpenseService: MockedClassMethods<ExpenseService> = {
  getExpenses: jest.fn(),
  createExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
};

export const mockNotificationService: MockedClassMethods<NotificationService> = {
  sendPushNotification: jest.fn(),
  notifyHouseholdMembers: jest.fn(),
};
