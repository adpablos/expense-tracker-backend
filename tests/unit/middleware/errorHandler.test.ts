// src/middleware/errorHandler.test.ts

import express from 'express';
import { UnauthorizedError } from 'express-jwt';
import request from 'supertest';

import { errorHandler } from '../../../src/middleware/errorHandler';
import { AppError } from '../../../src/utils/AppError';

// Mock the logger to avoid logging during tests
jest.mock('../../../src/config/logger', () => ({
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('errorHandler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Test route that throws different types of errors
    app.get('/app-error', (req, res, next) => {
      next(new AppError('Test AppError', 400));
    });

    app.get('/unauthorized-error', (req, res, next) => {
      next(new UnauthorizedError('invalid_token', { message: 'Invalid token' }));
    });

    app.get('/unknown-error', (req, res, next) => {
      next(new Error('Unknown error'));
    });

    // Route to handle not found routes
    app.use((req, res, next) => {
      next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    });

    // Error handler middleware
    app.use(errorHandler);
  });

  it('should handle AppError correctly', async () => {
    const response = await request(app).get('/app-error');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Test AppError',
    });
  });

  it('should handle UnauthorizedError correctly', async () => {
    const response = await request(app).get('/unauthorized-error');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 'error',
      message: 'No authorization token was found',
    });
  });

  it('should handle unknown errors correctly', async () => {
    const response = await request(app).get('/unknown-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      message: 'An unexpected error occurred',
    });
  });

  it('should handle not found routes correctly', async () => {
    const response = await request(app).get('/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: "Can't find /non-existent-route on this server!",
    });
  });
});
