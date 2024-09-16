import 'reflect-metadata';
import { Container } from 'inversify';
import { Pool } from 'pg';

import { CategoryRepository } from '../src/repositories/categoryRepository';
import { ExpenseRepository } from '../src/repositories/expenseRepository';
import { HouseholdRepository } from '../src/repositories/householdRepository';
import { SubcategoryRepository } from '../src/repositories/subcategoryRepository';
import { UserRepository } from '../src/repositories/userRepository';
import { DI_TYPES } from '../src/types/di';

// Importaciones de mocks

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

export function createTestContainer(
  options: {
    mockServices?: boolean;
    mockRepositories?: boolean;
    mockMiddleware?: boolean;
  } = {}
) {
  const container = new Container();

  // Mock Pool (siempre mockeado para evitar conexiones reales a la base de datos)
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  container.bind<Pool>(DI_TYPES.Pool).toConstantValue(mockPool as unknown as Pool);

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

// Funciones de ayuda para crear contenedores específicos

export function createRouteTestContainer() {
  return createTestContainer({ mockServices: true, mockMiddleware: true });
}

export function createServiceTestContainer() {
  return createTestContainer({ mockRepositories: true });
}

export function createRepositoryTestContainer() {
  return createTestContainer();
}
