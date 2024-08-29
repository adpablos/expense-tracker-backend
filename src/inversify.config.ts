import 'reflect-metadata';
import {Container} from 'inversify';
import {TYPES} from './types';
import {UserService} from './services/userService';
import {HouseholdService} from './services/householdService';
import {ExpenseService} from './services/expenseService';
import {CategoryService} from './services/categoryService';
import {SubcategoryService} from './services/subcategoryService';
import {NotificationService} from './services/external/notificationService';
import {UserController} from './controllers/userController';
import {HouseholdController} from './controllers/householdController';
import {ExpenseController} from './controllers/expenseController';
import {CategoryController} from './controllers/categoryController';
import {SubcategoryController} from './controllers/subcategoryController';

const container = new Container();

// Bind your services and controllers here
container.bind<UserService>(TYPES.UserService).to(UserService);
container.bind<HouseholdService>(TYPES.HouseholdService).to(HouseholdService);
container.bind<ExpenseService>(TYPES.ExpenseService).to(ExpenseService);
container.bind<CategoryService>(TYPES.CategoryService).to(CategoryService);
container.bind<SubcategoryService>(TYPES.SubcategoryService).to(SubcategoryService);
container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService);

container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<HouseholdController>(TYPES.HouseholdController).to(HouseholdController);
container.bind<ExpenseController>(TYPES.ExpenseController).to(ExpenseController);
container.bind<CategoryController>(TYPES.CategoryController).to(CategoryController);
container.bind<SubcategoryController>(TYPES.SubcategoryController).to(SubcategoryController);

export {container};