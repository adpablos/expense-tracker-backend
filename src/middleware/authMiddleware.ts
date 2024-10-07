import { Response, NextFunction, Request } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import { inject, injectable } from 'inversify';
import jwksRsa from 'jwks-rsa';

import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { User } from '../models/User';
import { UserService } from '../services/userService';

@injectable()
export class AuthMiddleware {
  constructor(@inject(DI_TYPES.UserService) protected userService: UserService) {}

  public authMiddleware: (req: Request, res: Response, next: NextFunction) => void = (
    req,
    res,
    next
  ) => {
    expressjwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      }) as GetVerificationKey,
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    })(req, res, (err) => {
      if (err) {
        logger.error('JWT verification failed', {
          error: err.name,
          message: err.message,
          url: req.url,
          method: req.method,
        });
        return res.status(401).json({ message: 'Invalid token' });
      }
      next();
    });
  };

  public attachUser: (req: Request, res: Response, next: NextFunction) => Promise<void> = async (
    req,
    res,
    next
  ) => {
    if (!req.auth) {
      logger.error('No authentication token provided', {
        url: req.url,
        method: req.method,
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
        });
        res.status(403).json({ message: 'User not registered in the system' });
        return;
      }

      req.user = new User(userData.email, userData.name, userData.authProviderId);
      req.user.id = userData.id;

      logger.info('User authenticated and attached to request', {
        userId: req.user.id,
        url: req.url,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Error attaching user to request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        authProviderId: req.auth.sub,
        url: req.url,
        method: req.method,
      });
      next(error);
    }
  };
}
