// src/middleware/responseLogger.ts
import { NextFunction, Request, Response } from 'express';

import logger from '../config/logger';

export const responseLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (body?: string | object | number | boolean | Buffer): Response {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Date.now() - (req.startTime || Date.now()),
      contentLength: res.get ? res.get('Content-Length') : undefined,
      body: process.env.NODE_ENV !== 'production' ? body : undefined,
    };

    if (typeof logData.body === 'object') {
      try {
        logData.body = JSON.stringify(logData.body);
      } catch (error) {
        logData.body = '[Cuerpo no serializable]';
      }
    }

    if (typeof logData.body === 'string' && logData.body.length > 1000) {
      logData.body = logData.body.substring(0, 1000) + '... [truncated]';
    }

    logger.info(`Outgoing response: ${res.statusCode} ${req.method} ${req.originalUrl}`, logData);

    res.send = originalSend;
    return originalSend.call(this, body);
  };

  next();
};
