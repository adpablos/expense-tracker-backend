// src/middleware/errorHandler.test.ts

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from 'express-jwt';

import { errorHandler } from '../../../src/middleware/errorHandler';
import { AppError } from '../../../src/utils/AppError';

describe('errorHandler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should handle AppError correctly', () => {
    const appError = new AppError('Test error', 400);
    errorHandler(appError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Test error',
    });
  });

  it('should handle UnauthorizedError correctly', () => {
    const unauthorizedError = new UnauthorizedError('invalid_token', { message: 'Invalid token' });
    errorHandler(unauthorizedError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'No authorization token was found',
    });
  });

  it('should handle unknown errors correctly', () => {
    const unknownError = new Error('Unknown error');
    errorHandler(unknownError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Unknown error',
    });
  });
});
