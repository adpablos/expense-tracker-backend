import { Container } from 'inversify';

import { CategoryRepository } from '../src/repositories/categoryRepository';
import { HouseholdRepository } from '../src/repositories/householdRepository';
import { SubcategoryRepository } from '../src/repositories/subcategoryRepository';
import { UserRepository } from '../src/repositories/userRepository';
import { CategoryService } from '../src/services/categoryService';
import { NotificationService } from '../src/services/external/notificationService';
import { HouseholdService } from '../src/services/householdService';
import { SubcategoryService } from '../src/services/subcategoryService';
import { UserService } from '../src/services/userService';
import { UserHouseholdTransactionCoordinator } from '../src/transaction-coordinators/userHouseholdTransactionCoordinator';
import { DI_TYPES } from '../src/types/di';

import {
  mockCategoryService,
  mockHouseholdService,
  mockNotificationService,
  mockSubcategoryService,
  mockUserService,
} from './unit/mocks/serviceMocks';

class MockHouseholdService extends HouseholdService {
  constructor() {
    super({} as HouseholdRepository);
    Object.assign(this, mockHouseholdService);
  }
}

class MockUserService extends UserService {
  constructor() {
    super(
      {} as UserRepository,
      {} as HouseholdRepository,
      {} as UserHouseholdTransactionCoordinator
    );
    Object.assign(this, mockUserService);
  }
}

class MockNotificationService extends NotificationService {
  constructor() {
    super({} as HouseholdService);
    Object.assign(this, mockNotificationService);
  }
}

class MockCategoryService extends CategoryService {
  constructor() {
    super({} as CategoryRepository, {} as NotificationService);
    Object.assign(this, mockCategoryService);
  }
}

class MockSubcategoryService extends SubcategoryService {
  constructor() {
    super({} as SubcategoryRepository, {} as NotificationService);
    Object.assign(this, mockSubcategoryService);
  }
}

const testContainer = new Container();

testContainer
  .bind<HouseholdService>(DI_TYPES.HouseholdService)
  .toConstantValue(new MockHouseholdService());
testContainer.bind<UserService>(DI_TYPES.UserService).toConstantValue(new MockUserService());
testContainer
  .bind<NotificationService>(DI_TYPES.NotificationService)
  .toConstantValue(new MockNotificationService());
testContainer
  .bind<CategoryService>(DI_TYPES.CategoryService)
  .toConstantValue(new MockCategoryService());
testContainer
  .bind<SubcategoryService>(DI_TYPES.SubcategoryService)
  .toConstantValue(new MockSubcategoryService());

export { testContainer };
