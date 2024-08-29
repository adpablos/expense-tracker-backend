// src/middleware/responseLogger.ts
import { NextFunction, Response } from 'express';

import logger from '../config/logger';
import { ExtendedRequest } from '../types/express';

const responseLogger = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (body?: string | object | number | boolean | Buffer): Response {
    logger.info('Outgoing response', {
      statusCode: res.statusCode,
      body,
    });

    res.send = originalSend; // Reset send method to its original implementation
    return res.send(body);
  };

  next();
};

export default responseLogger;
