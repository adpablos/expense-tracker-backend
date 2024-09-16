// src/middleware/requestLogger.ts
import { NextFunction, Response } from 'express';

import logger from '../config/logger';
import { ExtendedRequest } from '../types/express';

export const requestLogger = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  next();
};
