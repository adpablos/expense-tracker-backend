import { container } from '../setup/jest.setup';

import { mockAuthMiddleware } from './mockAuthMiddleware';
import { mockHouseholdMiddleware } from './mockHouseholdMiddleware';

export function mockMiddlewares(): void {
  mockAuthMiddleware(container);
  mockHouseholdMiddleware(container);
}
