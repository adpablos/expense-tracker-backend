// src/middleware/__tests__/responseLogger.test.ts
import { Request, Response, NextFunction } from 'express';

import logger from '../../../src/config/logger';
import { responseLogger } from '../../../src/middleware/responseLogger';

jest.mock('../../../src/config/logger');

describe('responseLogger middleware', () => {
  it('debe registrar la respuesta saliente y llamar a next()', () => {
    const req: Partial<Request> = {
      method: 'GET',
      originalUrl: '/api/test',
      startTime: Date.now(),
    };

    const res: Partial<Response> = {
      send: jest.fn().mockReturnThis(),
      statusCode: 200,
      get: jest.fn().mockReturnValue('100'),
    };

    const next = jest.fn() as NextFunction;

    responseLogger(req as Request, res as Response, next);

    const responseBody = { message: 'Success' };
    res.send!(responseBody);

    expect(logger.info).toHaveBeenCalledWith(
      'Outgoing response: 200 GET /api/test',
      expect.objectContaining({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: expect.any(Number),
        contentLength: '100',
        body: JSON.stringify(responseBody),
      })
    );

    expect(next).toHaveBeenCalled();
  });
});
