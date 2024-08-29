import { Container } from 'inversify';

import { NotificationService } from '../services/external/notificationService';
import { HouseholdService } from '../services/householdService';
import { UserService } from '../services/userService';

import pool from './db';

const container = new Container();

container.bind<HouseholdService>(HouseholdService).toSelf();
container.bind<UserService>(UserService).toSelf();
container.bind<NotificationService>(NotificationService).toSelf();
container.bind('DbPool').toConstantValue(pool);

export { container };
