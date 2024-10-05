// src/middleware/__tests__/requestLogger.test.ts
import { Request, Response, NextFunction } from 'express';

import logger from '../../../src/config/logger';
import { requestLogger } from '../../../src/middleware/requestLogger';

jest.mock('../../../src/config/logger');

describe('requestLogger middleware', () => {
  it('debe registrar la solicitud entrante y llamar a next()', () => {
    // Create mock objects for Request, Response, and NextFunction
    const req = {
      method: 'GET',
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000'),
      originalUrl: '/api/test',
      params: { id: '123' },
      query: { search: 'test' },
      body: { key: 'value' },
      startTime: Date.now(), // Añade la propiedad startTime
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    // Call the middleware
    requestLogger(req, res, next);

    // Verify that the logger was called with the correct arguments
    expect(logger.info).toHaveBeenCalledWith('Incoming request: GET /api/test', {
      method: 'GET',
      url: 'http://localhost:3000/api/test',
      params: { id: '123' },
      query: { search: 'test' },
      body: { key: 'value' },
    });

    // Verify that next() was called
    expect(next).toHaveBeenCalled();
  });
});
