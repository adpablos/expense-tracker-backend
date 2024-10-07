import { Request, Response, NextFunction } from 'express';
import { injectable, inject, Container } from 'inversify';
import { Pool } from 'pg';

import { DI_TYPES } from '../../../src/config/di';
import logger from '../../../src/config/logger';
import { AuthMiddleware } from '../../../src/middleware/authMiddleware';
import { UserService } from '../../../src/services/userService';
import { TestData } from '../setup/testData';

// Importa explícitamente la extensión de Request

@injectable()
export class MockAuthMiddleware extends AuthMiddleware {
  constructor(
    @inject(DI_TYPES.UserService) protected userService: UserService,
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
    logger.debug('Auth middleware called', { authHeader });

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      logger.debug('Token extracted', { token });

      if (token === 'fake-token') {
        const client = await this.pool.connect();
        try {
          const testData = new TestData();
          await testData.initialize(client);
          req.auth = {
            sub: testData.testUser.auth_provider_id,
            email: testData.testUser.email,
          };
          logger.debug('Auth object set', { auth: req.auth });
          next();
        } finally {
          client.release();
        }
        return;
      } else if (token.startsWith('fake-token-')) {
        const authProviderId = token.split('-')[2];
        logger.debug('Auth provider ID extracted', { authProviderId });

        req.auth = {
          sub: authProviderId,
          email: `user-${authProviderId.split('|')[1]}@example.com`,
        };
        logger.debug('Auth object set', { auth: req.auth });
        next();
      } else {
        logger.warn('Invalid token', { token });
        res.status(401).json({ message: 'Invalid token' });
        return;
      }
    } else {
      logger.warn('Unauthorized request', { authHeader });
      res.status(401).json({ message: 'Unauthorized' });
    }
  };

  public attachUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    logger.debug('Attach user called', { authHeader });

    if (!authHeader) {
      logger.warn('No authorization header');
      res.status(401).json({ message: 'No authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const authProviderId = token.startsWith('fake-token-') ? token.split('-')[2] : 'auth0|123456';
    logger.debug('Auth provider ID for user lookup', { authProviderId });

    try {
      const user = await this.userService.getUserByAuthProviderId(authProviderId);
      if (!user) {
        logger.warn('User not found', { authProviderId });
        res.status(401).json({ message: 'User not found' });
        return;
      }
      req.user = user;
      logger.debug('Attached user to request', {
        userId: req.user.id,
        email: req.user.email,
        authProviderId: req.user.authProviderId,
      });
      next();
    } catch (error) {
      logger.error('Error in mock auth middleware', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export function mockAuthMiddleware(container: Container): void {
  container.rebind<AuthMiddleware>(DI_TYPES.AuthMiddleware).to(MockAuthMiddleware);
}
