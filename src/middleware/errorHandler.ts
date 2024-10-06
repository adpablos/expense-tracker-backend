import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from 'express-jwt';

import logger from '../config/logger';
import { AppError } from '../utils/AppError';

interface DatabaseError extends Error {
  code?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
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
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // UnauthorizedError
  if (err instanceof UnauthorizedError) {
    logger.error('UnauthorizedError:', logContext);
    res.status(401).json({
      status: 'error',
      message: 'No authorization token was found',
    });
    return;
  }

  // Database errors
  if (err.name === 'DatabaseError') {
    const dbError = err as DatabaseError;
    logger.error('DatabaseError:', { ...logContext, code: dbError.code });
    res.status(500).json({
      status: 'error',
      message: 'A database error occurred',
    });
    return;
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
