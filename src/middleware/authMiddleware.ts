import { Response, NextFunction, Request } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import { inject, injectable } from 'inversify';
import { JwtPayload } from 'jsonwebtoken';

import config from '../config/config';
import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { User } from '../models/User';
import authClient from '../services/external/clients/authClient';
import { UserService } from '../services/userService';

// Extend Express Request type to include our custom properties
declare module 'express-serve-static-core' {
  interface Request {
    auth?: JwtPayload & {
      sub: string;
      email: string;
      aud?: string | string[];
      iss?: string;
    };
    user?: User;
  }
}

@injectable()
export class AuthMiddleware {
  constructor(@inject(DI_TYPES.UserService) protected userService: UserService) {}

  public authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    expressjwt({
      secret: authClient as GetVerificationKey,
      audience: config.auth.audience,
      issuer: config.auth.issuer,
      algorithms: config.auth.algorithms,
    })(req, res, (err) => {
      if (err) {
        logger.error('JWT verification failed', {
          error: err.name,
          message: err.message,
          expectedIssuer: config.auth.issuer,
          expectedAudience: config.auth.audience,
          receivedToken: req.headers.authorization?.substring(0, 50) + '...',
          url: req.url,
          method: req.method,
          environment: config.server.nodeEnv,
        });
        return res.status(401).json({
          message: 'Invalid token',
          details: config.server.nodeEnv === 'development' ? err.message : undefined,
        });
      }
      next();
    });
  };

  public attachUser = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      logger.error('No authentication token provided', {
        url: req.url,
        method: req.method,
        headers: req.headers,
      });
      res.status(401).json({ message: 'No authentication token provided' });
      return;
    }

    try {
      const userData = await this.userService.getUserByAuthProviderId(req.auth.sub);
      if (!userData) {
        logger.error('User not registered in the system', {
          authProviderId: req.auth.sub,
          url: req.url,
          method: req.method,
          tokenInfo: {
            sub: req.auth.sub,
            aud: req.auth.aud,
            iss: req.auth.iss,
          },
        });
        res.status(403).json({ message: 'User not registered in the system' });
        return;
      }

      req.user = new User(userData.email, userData.name, userData.authProviderId);
      req.user.id = userData.id;

      logger.info('User authenticated and attached to request', {
        userId: req.user.id,
        email: userData.email,
        url: req.url,
        method: req.method,
        authProviderId: userData.authProviderId,
      });

      next();
    } catch (error) {
      logger.error('Error attaching user to request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        authProviderId: req.auth.sub,
        url: req.url,
        method: req.method,
        environment: config.server.nodeEnv,
      });
      next(error);
    }
  };
}
