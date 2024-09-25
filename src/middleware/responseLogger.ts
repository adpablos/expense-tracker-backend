// src/middleware/responseLogger.ts
import { NextFunction, Response } from 'express';

import logger from '../config/logger';
import { ExtendedRequest } from '../types/express';

export const responseLogger = (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (body?: string | object | number | boolean | Buffer): Response {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
      contentLength: res.get('Content-Length'),
      body: process.env.NODE_ENV !== 'production' ? body : undefined, // Just log the body in non-production environments
    };

    // If the body is an object, try to convert it to a JSON string
    if (typeof logData.body === 'object') {
      try {
        logData.body = JSON.stringify(logData.body);
      } catch (error) {
        logData.body = '[Cuerpo no serializable]';
      }
    }

    // Truncate the body if it's too long
    if (typeof logData.body === 'string' && logData.body.length > 1000) {
      logData.body = logData.body.substring(0, 1000) + '... [truncated]';
    }

    logger.info(`Outgoing response: ${res.statusCode} ${req.method} ${req.originalUrl}`, logData);

    res.send = originalSend;
    return res.send(body);
  };

  next();
};
