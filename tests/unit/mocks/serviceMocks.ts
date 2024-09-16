import { CategoryHierarchyService } from '../../../src/services/categoryHierarchyService';
import { CategoryService } from '../../../src/services/categoryService';
import { ExpenseService } from '../../../src/services/expenseService';
import { NotificationService } from '../../../src/services/external/notificationService';
import { OpenAIService } from '../../../src/services/external/openaiService';
import { TempFileHandler } from '../../../src/services/fileProcessors/TempFileHandler';
import { HouseholdService } from '../../../src/services/householdService';
import { SubcategoryService } from '../../../src/services/subcategoryService';
import { UserService } from '../../../src/services/userService';

type MockedClassMethods<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? jest.Mock : T[K];
};

export const mockUserService: MockedClassMethods<UserService> = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  createUserWithHousehold: jest.fn(),
  getUserById: jest.fn(),
  getUserByAuthProviderId: jest.fn(),
  deleteUser: jest.fn(),
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
  getCategoryById: jest.fn(),
  getAllCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  deleteSubcategoriesByCategoryId: jest.fn(),
};

export const mockSubcategoryService: MockedClassMethods<SubcategoryService> = {
  getSubcategoryById: jest.fn(),
  getSubcategoriesByCategoryId: jest.fn(),
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

export const mockOpenAIService: MockedClassMethods<OpenAIService> = {
  processReceipt: jest.fn(),
  transcribeAudio: jest.fn(),
  analyzeTranscription: jest.fn(),
};

export const mockTempFileHandler: Partial<jest.Mocked<TempFileHandler>> = {
  createTempFile: jest.fn(),
  deleteTempFiles: jest.fn(),
};

export const mockCategoryHierarchyService: Partial<jest.Mocked<CategoryHierarchyService>> = {
  getCategoriesAndSubcategories: jest.fn(),
};
