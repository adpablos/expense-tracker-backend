import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from 'express-jwt';

import logger from '../config/logger';
import { AppError } from '../utils/AppError';

interface DatabaseError extends Error {
  code?: string;
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const logContext = {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    body: req.body,
    userId: req.user?.id,
    errorName: err.name,
    errorMessage: err.message,
    errorStack:
      process.env.NODE_ENV === 'production'
        ? undefined
        : err.stack?.split('\n').slice(0, 3).join('\n'),
  };

  // AppError
  if (err instanceof AppError) {
    logger.error('AppError:', { ...logContext, statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // UnauthorizedError
  if (err instanceof UnauthorizedError) {
    logger.error('UnauthorizedError:', logContext);
    return res.status(401).json({
      status: 'error',
      message: 'No authorization token was found',
    });
  }

  // Database errors
  if (err.name === 'DatabaseError') {
    const dbError = err as DatabaseError;
    logger.error('DatabaseError:', { ...logContext, code: dbError.code });
    return res.status(500).json({
      status: 'error',
      message: 'A database error occurred',
    });
  }

  // Unexpected error
  logger.error('Unexpected error:', logContext);

  // In production, do not send error details to the client
  const clientMessage =
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;

  res.status(500).json({
    status: 'error',
    message: clientMessage,
  });
};
