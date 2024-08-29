import 'reflect-metadata';
import {Container} from 'inversify';
import {DI_TYPES} from '../src/types/di';
import {UserService} from '../src/services/userService';
import {HouseholdService} from '../src/services/householdService';
import {ExpenseService} from '../src/services/expenseService';
import {CategoryService} from '../src/services/categoryService';
import {SubcategoryService} from '../src/services/subcategoryService';
import {NotificationService} from '../src/services/external/notificationService';
import {UserController} from '../src/controllers/userController';
import {HouseholdController} from '../src/controllers/householdController';
import {ExpenseController} from '../src/controllers/expenseController';
import {CategoryController} from '../src/controllers/categoryController';
import {SubcategoryController} from '../src/controllers/subcategoryController';

export function createTestContainer() {
    const container = new Container();

    // Mock services
    const mockUserService = {
        getUserByAuthProviderId: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        createUser: jest.fn(),
        createUserWithHousehold: jest.fn(),
        getUserById: jest.fn(),
        getUserHouseholds: jest.fn(),
    };

    const mockHouseholdService = {
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
        householdExists: jest.fn(),
    };

    const mockExpenseService = {
        getExpenses: jest.fn(),
        createExpense: jest.fn(),
        updateExpense: jest.fn(),
        deleteExpense: jest.fn(),
        uploadExpense: jest.fn(),
    };

    const mockCategoryService = {
        getAllCategories: jest.fn(),
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        deleteCategory: jest.fn(),
        deleteSubcategoriesByCategoryId: jest.fn(),
    };

    const mockSubcategoryService = {
        getAllSubcategories: jest.fn(),
        createSubcategory: jest.fn(),
        updateSubcategory: jest.fn(),
        deleteSubcategory: jest.fn(),
    };

    const mockNotificationService = {
        sendPushNotification: jest.fn(),
        notifyHouseholdMembers: jest.fn(),
    };

    // Bind mock services
    container.bind<UserService>(DI_TYPES.UserService).toConstantValue(mockUserService as unknown as UserService);
    container.bind<HouseholdService>(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService as unknown as HouseholdService);
    container.bind<ExpenseService>(DI_TYPES.ExpenseService).toConstantValue(mockExpenseService as unknown as ExpenseService);
    container.bind<CategoryService>(DI_TYPES.CategoryService).toConstantValue(mockCategoryService as unknown as CategoryService);
    container.bind<SubcategoryService>(DI_TYPES.SubcategoryService).toConstantValue(mockSubcategoryService as unknown as SubcategoryService);
    container.bind<NotificationService>(DI_TYPES.NotificationService).toConstantValue(mockNotificationService as unknown as NotificationService);

    // Bind controllers
    container.bind<UserController>(DI_TYPES.UserController).to(UserController);
    container.bind<HouseholdController>(DI_TYPES.HouseholdController).to(HouseholdController);
    container.bind<ExpenseController>(DI_TYPES.ExpenseController).to(ExpenseController);
    container.bind<CategoryController>(DI_TYPES.CategoryController).to(CategoryController);
    container.bind<SubcategoryController>(DI_TYPES.SubcategoryController).to(SubcategoryController);

    return container;
}