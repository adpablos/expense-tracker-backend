import 'reflect-metadata';
import { Container } from 'inversify';
import { Pool } from 'pg';

import { DI_TYPES } from '../../../src/config/di';
import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { ExpenseRepository } from '../../../src/repositories/expenseRepository';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { SubcategoryRepository } from '../../../src/repositories/subcategoryRepository';
import { UserRepository } from '../../../src/repositories/userRepository';
import {
  createMockAuthMiddleware,
  createMockHouseholdMiddleware,
  mockRequestLogger,
  mockResponseLogger,
} from '../../unit/mocks/middlewareMocks';
import {
  mockUserRepository,
  mockHouseholdRepository,
  mockCategoryRepository,
  mockExpenseRepository,
  mockSubcategoryRepository,
} from '../../unit/mocks/repositoryMocks';
import {
  mockUserService,
  mockHouseholdService,
  mockExpenseService,
  mockCategoryService,
  mockSubcategoryService,
  mockNotificationService,
  mockOpenAIService,
  mockTempFileHandler,
  mockCategoryHierarchyService,
} from '../../unit/mocks/serviceMocks';

interface UnitTestContainerOptions {
  mockServices?: boolean;
  mockRepositories?: boolean;
  mockMiddleware?: boolean;
  mockDbPool?: boolean;
}

export function createUnitTestContainer(options: UnitTestContainerOptions = {}) {
  const container = new Container();

  if (options.mockDbPool) {
    const mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };
    container.bind<Pool>(DI_TYPES.DbPool).toConstantValue(mockPool as unknown as Pool);
  } else {
    const realPool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
    });
    container.bind<Pool>(DI_TYPES.DbPool).toConstantValue(realPool);
  }

  if (options.mockServices) {
    container.bind(DI_TYPES.UserService).toConstantValue(mockUserService);
    container.bind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
    container.bind(DI_TYPES.ExpenseService).toConstantValue(mockExpenseService);
    container.bind(DI_TYPES.CategoryService).toConstantValue(mockCategoryService);
    container.bind(DI_TYPES.SubcategoryService).toConstantValue(mockSubcategoryService);
    container.bind(DI_TYPES.NotificationService).toConstantValue(mockNotificationService);
    container.bind(DI_TYPES.OpenAIService).toConstantValue(mockOpenAIService);
    container.bind(DI_TYPES.CategoryHierarchyService).toConstantValue(mockCategoryHierarchyService);
    container.bind(DI_TYPES.TempFileHandler).toConstantValue(mockTempFileHandler);
  }

  if (options.mockRepositories) {
    container.bind(DI_TYPES.UserRepository).toConstantValue(mockUserRepository);
    container.bind(DI_TYPES.HouseholdRepository).toConstantValue(mockHouseholdRepository);
    container.bind(DI_TYPES.CategoryRepository).toConstantValue(mockCategoryRepository);
    container.bind(DI_TYPES.ExpenseRepository).toConstantValue(mockExpenseRepository);
    container.bind(DI_TYPES.SubcategoryRepository).toConstantValue(mockSubcategoryRepository);
  } else {
    container.bind<CategoryRepository>(DI_TYPES.CategoryRepository).to(CategoryRepository);
    container.bind<ExpenseRepository>(DI_TYPES.ExpenseRepository).to(ExpenseRepository);
    container.bind<HouseholdRepository>(DI_TYPES.HouseholdRepository).to(HouseholdRepository);
    container.bind<SubcategoryRepository>(DI_TYPES.SubcategoryRepository).to(SubcategoryRepository);
    container.bind<UserRepository>(DI_TYPES.UserRepository).to(UserRepository);
  }

  if (options.mockMiddleware) {
    const mockHouseholdService = {
      userHasAccessToHousehold: jest.fn().mockResolvedValue(true),
    };

    container.bind(DI_TYPES.AuthMiddleware).toConstantValue(createMockAuthMiddleware());
    container
      .bind(DI_TYPES.HouseholdMiddleware)
      .toConstantValue(createMockHouseholdMiddleware(mockHouseholdService));
    container.bind(DI_TYPES.RequestLogger).toConstantValue(mockRequestLogger);
    container.bind(DI_TYPES.ResponseLogger).toConstantValue(mockResponseLogger);
  }

  return container;
}

// Helper function for repository tests (since it's the only one being used)
export function createRepositoryTestContainer() {
  return createUnitTestContainer({ mockDbPool: true });
}
