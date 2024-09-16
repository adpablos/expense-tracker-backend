// src/middleware/__tests__/responseLogger.test.ts
import { Request, Response, NextFunction } from 'express';

import logger from '../../../src/config/logger';
import { responseLogger } from '../../../src/middleware/responseLogger';

describe('responseLogger middleware', () => {
  it('debe registrar la respuesta saliente y llamar a next()', () => {
    const req = {} as Request;

    // Mock the response object
    const res = {
      send: jest.fn(),
      statusCode: 200,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    // Call the middleware
    responseLogger(req, res, next);

    // Simulate a response
    const responseBody = { message: 'Success' };
    res.send(responseBody);

    // Verify that logger.info was called with the response
    expect(logger.info).toHaveBeenCalledWith('Outgoing response', {
      statusCode: 200,
      body: responseBody,
    });

    // Verify that next() was called
    expect(next).toHaveBeenCalled();
  });
});
