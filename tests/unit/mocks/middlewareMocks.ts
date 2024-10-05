import { Request, Response, NextFunction } from 'express';

import { AuthMiddleware } from '../../../src/middleware/authMiddleware';
import { HouseholdMiddleware } from '../../../src/middleware/householdMiddleware';
import { User } from '../../../src/models/User';

interface MockHouseholdService {
  userHasAccessToHousehold: (userId: string, householdId: string | undefined) => Promise<boolean>;
}

type MockedClassMethods<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? jest.Mock : T[K];
};

export const createMockAuthMiddleware = (
  userId: string = 'mock-user-id'
): MockedClassMethods<AuthMiddleware> => ({
  authMiddleware: jest.fn((req, res, next) => next()),
  attachUser: jest.fn(async (req: Request, res: Response, next: NextFunction) => {
    req.user = new User('test@example.com', 'Test User', 'auth123456', userId, []);
    next();
    return Promise.resolve(undefined);
  }),
});

export const createMockHouseholdMiddleware = (
  mockHouseholdService: MockHouseholdService,
  options: {
    alwaysGrantAccess?: boolean;
    skipAccessCheck?: boolean;
  } = {}
): MockedClassMethods<HouseholdMiddleware> => ({
  setCurrentHousehold: jest.fn(async (req: Request, res: Response, next: NextFunction) => {
    if (options.skipAccessCheck) {
      req.currentHouseholdId = req.header('X-Household-Id') || 'default-household-id';
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const hasAccess =
      options.alwaysGrantAccess ||
      (await mockHouseholdService.userHasAccessToHousehold(
        req.user.id,
        req.header('X-Household-Id')
      ));

    if (hasAccess) {
      req.currentHouseholdId = req.header('X-Household-Id') || 'default-household-id';
      next();
    } else {
      res.status(403).json({ message: 'User does not have access to this household' });
    }
  }) as jest.Mock<Promise<void>>,
  ensureHouseholdSelected: jest.fn((req: Request, res: Response, next: NextFunction) => {
    if (!req.currentHouseholdId && !options.skipAccessCheck) {
      res.status(400).json({ message: 'No household selected' });
    } else {
      next();
    }
  }),
});

export const mockRequestLogger = jest.fn();
export const mockResponseLogger = jest.fn();
