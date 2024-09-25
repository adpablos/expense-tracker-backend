// src/middleware/requestLogger.ts
import { NextFunction, Response } from 'express';

import logger from '../config/logger';
import { ExtendedRequest } from '../types/express';

export const requestLogger = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  req.startTime = Date.now();

  const logData = {
    method: req.method,
    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    params: req.params && Object.keys(req.params).length ? req.params : undefined,
    query: req.query && Object.keys(req.query).length ? req.query : undefined,
    body: req.body && Object.keys(req.body).length ? req.body : undefined,
  };

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, logData);
  next();
};
