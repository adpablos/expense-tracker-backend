import 'reflect-metadata';
import { Container } from 'inversify';

import { CategoryController } from './controllers/categoryController';
import { ExpenseController } from './controllers/expenseController';
import { HouseholdController } from './controllers/householdController';
import { SubcategoryController } from './controllers/subcategoryController';
import { UserController } from './controllers/userController';
import { CategoryService } from './services/categoryService';
import { ExpenseService } from './services/expenseService';
import { NotificationService } from './services/external/notificationService';
import { HouseholdService } from './services/householdService';
import { SubcategoryService } from './services/subcategoryService';
import { UserService } from './services/userService';
import { DI_TYPES } from './types/di';

const container = new Container();

// Bind your services and controllers here
container.bind<UserService>(DI_TYPES.UserService).to(UserService);
container.bind<HouseholdService>(DI_TYPES.HouseholdService).to(HouseholdService);
container.bind<ExpenseService>(DI_TYPES.ExpenseService).to(ExpenseService);
container.bind<CategoryService>(DI_TYPES.CategoryService).to(CategoryService);
container.bind<SubcategoryService>(DI_TYPES.SubcategoryService).to(SubcategoryService);
container.bind<NotificationService>(DI_TYPES.NotificationService).to(NotificationService);

container.bind<UserController>(DI_TYPES.UserController).to(UserController);
container.bind<HouseholdController>(DI_TYPES.HouseholdController).to(HouseholdController);
container.bind<ExpenseController>(DI_TYPES.ExpenseController).to(ExpenseController);
container.bind<CategoryController>(DI_TYPES.CategoryController).to(CategoryController);
container.bind<SubcategoryController>(DI_TYPES.SubcategoryController).to(SubcategoryController);

export { container };
