import 'reflect-metadata';
import { Container } from 'inversify';
import { Pool } from 'pg';

import { DI_TYPES } from '../../../src/config/di';
import { CategoryController } from '../../../src/controllers/categoryController';
import { ExpenseController } from '../../../src/controllers/expenseController';
import { HouseholdController } from '../../../src/controllers/householdController';
import { SubcategoryController } from '../../../src/controllers/subcategoryController';
import { UserController } from '../../../src/controllers/userController';
import { AuthMiddleware } from '../../../src/middleware/authMiddleware';
import { HouseholdMiddleware } from '../../../src/middleware/householdMiddleware';
import { requestLogger } from '../../../src/middleware/requestLogger';
import { responseLogger } from '../../../src/middleware/responseLogger';
import { CategoryRepository } from '../../../src/repositories/categoryRepository';
import { ExpenseRepository } from '../../../src/repositories/expenseRepository';
import { HouseholdRepository } from '../../../src/repositories/householdRepository';
import { SubcategoryRepository } from '../../../src/repositories/subcategoryRepository';
import { UserRepository } from '../../../src/repositories/userRepository';
import { CategoryHierarchyService } from '../../../src/services/categoryHierarchyService';
import { CategoryService } from '../../../src/services/categoryService';
import { ExpenseService } from '../../../src/services/expenseService';
import { NotificationService } from '../../../src/services/external/notificationService';
import { OpenAIService } from '../../../src/services/external/openaiService';
import { AudioConverter } from '../../../src/services/fileProcessors/AudioConverter';
import { AudioProcessor } from '../../../src/services/fileProcessors/AudioProcessor';
import { FileProcessor } from '../../../src/services/fileProcessors/FileProcessor';
import { FileProcessorFactory } from '../../../src/services/fileProcessors/FileProcessorFactory';
import { ImageProcessor } from '../../../src/services/fileProcessors/ImageProcessor';
import { TempFileHandler } from '../../../src/services/fileProcessors/TempFileHandler';
import { HouseholdService } from '../../../src/services/householdService';
import { SubcategoryService } from '../../../src/services/subcategoryService';
import { UserService } from '../../../src/services/userService';
import { UserHouseholdTransactionCoordinator } from '../../../src/transaction-coordinators/userHouseholdTransactionCoordinator';
import testConfig from '../../integration/setup/testConfig';
import testDbClient from '../../integration/setup/testDbClient';

interface IntegrationTestContainerOptions {
  useTestDb?: boolean;
  mockAuth?: boolean;
}

export function createIntegrationTestContainer(
  options: IntegrationTestContainerOptions = {}
): Container {
  const container = new Container();

  // Limpiar bindings existentes de DbPool
  if (container.isBound(DI_TYPES.DbPool)) {
    container.unbind(DI_TYPES.DbPool);
  }

  // Configuración de test
  container.bind('Config').toConstantValue(testConfig);

  // Cliente de base de datos de test o real según la opción
  if (options.useTestDb) {
    container.bind<Pool>(DI_TYPES.DbPool).toConstantValue(testDbClient);
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

  // Repositorios
  container.bind(DI_TYPES.UserRepository).to(UserRepository);
  container.bind(DI_TYPES.HouseholdRepository).to(HouseholdRepository);
  container.bind(DI_TYPES.CategoryRepository).to(CategoryRepository);
  container.bind(DI_TYPES.ExpenseRepository).to(ExpenseRepository);
  container.bind(DI_TYPES.SubcategoryRepository).to(SubcategoryRepository);

  // Servicios
  container.bind(DI_TYPES.UserService).to(UserService);
  container.bind(DI_TYPES.HouseholdService).to(HouseholdService);
  container.bind(DI_TYPES.CategoryService).to(CategoryService);
  container.bind(DI_TYPES.ExpenseService).to(ExpenseService);
  container.bind(DI_TYPES.SubcategoryService).to(SubcategoryService);
  container.bind(DI_TYPES.CategoryHierarchyService).to(CategoryHierarchyService);
  container.bind(DI_TYPES.NotificationService).to(NotificationService);
  container.bind(DI_TYPES.OpenAIService).to(OpenAIService);

  // Procesadores de archivos
  container
    .bind<FileProcessor>(DI_TYPES.FileProcessor)
    .to(ImageProcessor)
    .whenTargetNamed('ImageProcessor');
  container
    .bind<FileProcessor>(DI_TYPES.FileProcessor)
    .to(AudioProcessor)
    .whenTargetNamed('AudioProcessor');
  container.bind<FileProcessorFactory>(DI_TYPES.FileProcessorFactory).to(FileProcessorFactory);
  container.bind<AudioConverter>(DI_TYPES.AudioConverter).to(AudioConverter);
  container.bind<TempFileHandler>(DI_TYPES.TempFileHandler).to(TempFileHandler);

  // Controladores
  container.bind(DI_TYPES.UserController).to(UserController);
  container.bind(DI_TYPES.HouseholdController).to(HouseholdController);
  container.bind(DI_TYPES.CategoryController).to(CategoryController);
  container.bind(DI_TYPES.ExpenseController).to(ExpenseController);
  container.bind(DI_TYPES.SubcategoryController).to(SubcategoryController);

  // Middleware con opción de mock para auth
  if (options.mockAuth) {
    const mockAuthMiddleware = {
      authenticate: jest.fn().mockImplementation((req, res, next) => next()),
      authorize: jest.fn().mockImplementation((req, res, next) => next()),
    };
    container.bind(DI_TYPES.AuthMiddleware).toConstantValue(mockAuthMiddleware);
  } else {
    container.bind(DI_TYPES.AuthMiddleware).to(AuthMiddleware);
  }

  container.bind(DI_TYPES.HouseholdMiddleware).to(HouseholdMiddleware);
  container.bind(DI_TYPES.RequestLogger).toConstantValue(requestLogger);
  container.bind(DI_TYPES.ResponseLogger).toConstantValue(responseLogger);

  // Coordinador de transacciones
  container
    .bind(DI_TYPES.UserHouseholdTransactionCoordinator)
    .to(UserHouseholdTransactionCoordinator);

  return container;
}
