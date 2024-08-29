// src/middleware/authMiddleware.ts
import { Response, NextFunction } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

import pool from '../config/db';
import logger from '../config/logger';
import { User } from '../models/User';
import { UserService } from '../services/userService';
import { ExtendedRequest, ExtendedRequestHandler } from '../types/express';

const userService = new UserService(pool);

export const authMiddleware: ExtendedRequestHandler = (req, res, next) => {
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

export const attachUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return res.status(401).json({ message: 'No authentication token provided' });
  }

  try {
    const userData = await userService.getUserByAuthProviderId(req.auth.sub);
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
