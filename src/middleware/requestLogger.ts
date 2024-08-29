// src/middleware/requestLogger.ts
import { NextFunction, Request, Response } from 'express';

import logger from '../config/logger';

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  next();
};

export default requestLogger;
