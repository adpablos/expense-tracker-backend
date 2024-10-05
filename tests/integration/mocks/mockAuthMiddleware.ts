import { Request, Response, NextFunction } from 'express';
import { injectable, inject, Container } from 'inversify';
import { Pool } from 'pg';

import logger from '../../../src/config/logger';
import { AuthMiddleware } from '../../../src/middleware/authMiddleware';
import { UserRepository } from '../../../src/repositories/userRepository';
import { UserService } from '../../../src/services/userService';
import { DI_TYPES } from '../../../src/types/di';
import { TestData } from '../setup/testData';

@injectable()
export class MockAuthMiddleware extends AuthMiddleware {
  constructor(
    @inject(DI_TYPES.UserService) userService: UserService,
    @inject(DI_TYPES.DbPool) private pool: Pool
  ) {
    super(userService);
  }

  public authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token === 'fake-token') {
        const client = await this.pool.connect();
        try {
          const testData = new TestData();
          await testData.initialize(client);
          req.auth = {
            sub: testData.testUser.auth_provider_id,
            email: testData.testUser.email,
          };
          next();
        } finally {
          client.release();
        }
        return;
      } else if (token.startsWith('fake-token-')) {
        const authProviderIdSuffix = token.split('-')[2];
        req.auth = {
          sub: `auth0|${authProviderIdSuffix}`,
          email: `user-${authProviderIdSuffix}@example.com`,
        };
      } else {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  };

  public attachUser = async (req: Request, res: Response, next: NextFunction) => {
    if (req.auth && req.auth.sub) {
      const userRepository = new UserRepository(this.pool);
      const user = await userRepository.getUserByAuthProviderId(req.auth.sub);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      req.user = user;
      logger.debug('Attached user to request', {
        userId: req.user.id,
        email: req.user.email,
        authProviderId: req.user.authProviderId,
      });
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

export function mockAuthMiddleware(container: Container): void {
  container.rebind<AuthMiddleware>(DI_TYPES.AuthMiddleware).to(MockAuthMiddleware);
}
