import {Container} from 'inversify';
import {TYPES} from '../types';
import {HouseholdService} from '../services/householdService';
import {UserService} from '../services/userService';
import {NotificationService} from '../services/external/notificationService';
import {CategoryService} from '../services/categoryService';
import {SubcategoryService} from '../services/subcategoryService';
import {
    mockCategoryService,
    mockHouseholdService,
    mockNotificationService,
    mockSubcategoryService,
    mockUserService
} from './unit/mocks/serviceMocks';

class MockHouseholdService extends HouseholdService {
    constructor() {
        super({} as any);
        Object.assign(this, mockHouseholdService);
    }
}

class MockUserService extends UserService {
    constructor() {
        super({} as any);
        Object.assign(this, mockUserService);
    }
}

class MockNotificationService extends NotificationService {
    constructor() {
        super();
        Object.assign(this, mockNotificationService);
    }
}

class MockCategoryService extends CategoryService {
    constructor() {
        super({} as any);
        Object.assign(this, mockCategoryService);
    }
}

class MockSubcategoryService extends SubcategoryService {
    constructor() {
        super({} as any);
        Object.assign(this, mockSubcategoryService);
    }
}

const testContainer = new Container();

testContainer.bind<HouseholdService>(TYPES.HouseholdService).toConstantValue(new MockHouseholdService());
testContainer.bind<UserService>(TYPES.UserService).toConstantValue(new MockUserService());
testContainer.bind<NotificationService>(TYPES.NotificationService).toConstantValue(new MockNotificationService());
testContainer.bind<CategoryService>(TYPES.CategoryService).toConstantValue(new MockCategoryService());
testContainer.bind<SubcategoryService>(TYPES.SubcategoryService).toConstantValue(new MockSubcategoryService());

export {testContainer};