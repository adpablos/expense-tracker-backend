import { Response, NextFunction } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import { inject, injectable } from 'inversify';
import jwksRsa from 'jwks-rsa';

import logger from '../config/logger';
import { User } from '../models/User';
import { UserService } from '../services/userService';
import { DI_TYPES } from '../types/di';
import { ExtendedRequest, ExtendedRequestHandler } from '../types/express';

@injectable()
export class AuthMiddleware {
  constructor(@inject(DI_TYPES.UserService) private userService: UserService) {}

  public authMiddleware: ExtendedRequestHandler = (req, res, next) => {
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
        logger.error('JWT Error: ', err);
        return res.status(401).json({ message: 'Invalid token', error: err.message });
      }
      logger.info('Token verified, proceeding...');
      next();
    });
  };

  public attachUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    try {
      const userData = await this.userService.getUserByAuthProviderId(req.auth.sub);
      if (!userData) {
        return res.status(403).json({ message: 'User not registered in the system' });
      }

      req.user = new User(userData.email, userData.name, userData.authProviderId);
      req.user.id = userData.id;
      // Add any other properties you need from userData

      next();
    } catch (error) {
      logger.error('Error in attachUser middleware', { error });
      next(error);
    }
  };
}
