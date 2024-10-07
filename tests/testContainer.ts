import 'reflect-metadata';
import { Container } from 'inversify';
import { Pool } from 'pg';

import logger from '../src/config/logger';
import { CategoryRepository } from '../src/repositories/categoryRepository';
import { ExpenseRepository } from '../src/repositories/expenseRepository';
import { HouseholdRepository } from '../src/repositories/householdRepository';
import { SubcategoryRepository } from '../src/repositories/subcategoryRepository';
import { UserRepository } from '../src/repositories/userRepository';
import { DI_TYPES } from '../src/config/di';

import { mockAuthMiddleware } from './integration/mocks/mockAuthMiddleware';
import {
  createMockAuthMiddleware,
  createMockHouseholdMiddleware,
  mockRequestLogger,
  mockResponseLogger,
} from './unit/mocks/middlewareMocks';
import {
  mockUserRepository,
  mockHouseholdRepository,
  mockCategoryRepository,
  mockExpenseRepository,
  mockSubcategoryRepository,
} from './unit/mocks/repositoryMocks';
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
} from './unit/mocks/serviceMocks';

// Añade esta importación al principio del archivo

export function createTestContainer(
  options: {
    mockServices?: boolean;
    mockRepositories?: boolean;
    mockMiddleware?: boolean;
    mockDbPool?: boolean;
  } = {}
) {
  const container = new Container();

  if (options.mockDbPool) {
    // Mock Pool (to avoid connection to the database)
    const mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };
    container.bind<Pool>(DI_TYPES.DbPool).toConstantValue(mockPool as unknown as Pool);
  } else {
    // Use the real Pool for integration tests
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
    // Bind mock services
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
    // Bind mock repositories
    container.bind(DI_TYPES.UserRepository).toConstantValue(mockUserRepository);
    container.bind(DI_TYPES.HouseholdRepository).toConstantValue(mockHouseholdRepository);
    container.bind(DI_TYPES.CategoryRepository).toConstantValue(mockCategoryRepository);
    container.bind(DI_TYPES.ExpenseRepository).toConstantValue(mockExpenseRepository);
    container.bind(DI_TYPES.SubcategoryRepository).toConstantValue(mockSubcategoryRepository);
  } else {
    // Bind real CategoryRepository for repository tests
    container.bind<CategoryRepository>(DI_TYPES.CategoryRepository).to(CategoryRepository);
    container.bind<ExpenseRepository>(DI_TYPES.ExpenseRepository).to(ExpenseRepository);
    container.bind<HouseholdRepository>(DI_TYPES.HouseholdRepository).to(HouseholdRepository);
    container.bind<SubcategoryRepository>(DI_TYPES.SubcategoryRepository).to(SubcategoryRepository);
    container.bind<UserRepository>(DI_TYPES.UserRepository).to(UserRepository);
  }

  if (options.mockMiddleware) {
    // Create mock HouseholdService with userHasAccessToHousehold method set to always return true
    const mockHouseholdService = {
      userHasAccessToHousehold: jest.fn().mockResolvedValue(true),
    };

    // Bind mock middleware
    container.bind(DI_TYPES.AuthMiddleware).toConstantValue(createMockAuthMiddleware());
    container
      .bind(DI_TYPES.HouseholdMiddleware)
      .toConstantValue(createMockHouseholdMiddleware(mockHouseholdService));
    container.bind(DI_TYPES.RequestLogger).toConstantValue(mockRequestLogger);
    container.bind(DI_TYPES.ResponseLogger).toConstantValue(mockResponseLogger);
  }

  return container;
}

// Helper functions to create specific containers

export function createRouteTestContainer() {
  return createTestContainer({ mockServices: true, mockMiddleware: true });
}

export function createServiceTestContainer() {
  return createTestContainer({ mockRepositories: true });
}

export function createRepositoryTestContainer() {
  return createTestContainer();
}

export async function createIntegrationTestContainer() {
  const container = new Container();

  // Bind all types defined in DI_TYPES
  for (const [key, value] of Object.entries(DI_TYPES)) {
    try {
      const paths = [
        `../src/services/${key}`,
        `../src/controllers/${key}`,
        `../src/repositories/${key}`,
        `../src/middleware/${key}`,
      ];

      for (const path of paths) {
        try {
          const module = await import(path);
          if (module[key]) {
            container.bind(value).to(module[key]);
            break;
          } else if (module.default) {
            // For middleware that export a default function
            container.bind(value).toFunction(module.default);
            break;
          }
        } catch (error) {
          // Log the error and continue with the next path
          logger.debug(`Error importing module from ${path}: ${error}`);
        }
      }
    } catch (error) {
      logger.warn(`Unable to automatically bind: ${key}. Error: ${error}`);
    }
  }

  // Special bindings that don't follow the standard pattern
  container.bind<Pool>(DI_TYPES.DbPool).toConstantValue(
    new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
    })
  );

  // Import and bind specific middleware
  const middlewarePaths = [
    '../src/middleware/requestLogger',
    '../src/middleware/responseLogger',
    '../src/middleware/errorHandler',
  ];

  for (const path of middlewarePaths) {
    try {
      const module = await import(path);
      const middlewareName = path.split('/').pop() as keyof typeof DI_TYPES;
      if (module.default) {
        container.bind(DI_TYPES[middlewareName]).toFunction(module.default);
      }
    } catch (error) {
      logger.warn(`Error binding middleware from ${path}: ${error}`);
    }
  }

  // Use mocks for AuthMiddleware and HouseholdMiddleware
  mockAuthMiddleware(container);
  // TODO: Add mockHouseholdMiddleware here if needed

  // Ensure all necessary repositories are bound
  container.bind<UserRepository>(DI_TYPES.UserRepository).to(UserRepository);
  container.bind<HouseholdRepository>(DI_TYPES.HouseholdRepository).to(HouseholdRepository);
  container.bind<CategoryRepository>(DI_TYPES.CategoryRepository).to(CategoryRepository);
  container.bind<ExpenseRepository>(DI_TYPES.ExpenseRepository).to(ExpenseRepository);
  container.bind<SubcategoryRepository>(DI_TYPES.SubcategoryRepository).to(SubcategoryRepository);

  return container;
}
