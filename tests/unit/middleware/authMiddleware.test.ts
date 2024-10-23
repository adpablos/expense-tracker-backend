import 'reflect-metadata';

import { Request, Response, NextFunction } from 'express';

import config from '../../../src/config/config';
import { AuthMiddleware } from '../../../src/middleware/authMiddleware';
import { User } from '../../../src/models/User';
import { UserService } from '../../../src/services/userService';

jest.mock('../../../src/services/userService');
jest.mock('express-jwt');
jest.mock('jwks-rsa');

// Mock express-jwt
jest.mock('express-jwt', () => ({
  expressjwt: jest.fn().mockImplementation((_config) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.headers?.authorization === 'Bearer valid_token') {
        req.auth = {
          sub: 'test_user_id',
          email: 'test@example.com',
        };
        next();
      } else {
        const error = new Error('Invalid token');
        error.name = 'UnauthorizedError';
        next(error);
      }
    };
  }),
}));

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request> & { headers: { authorization?: string } };
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockUserService = {
      getUserByAuthProviderId: jest.fn(),
    } as unknown as jest.Mocked<UserService>;
    authMiddleware = new AuthMiddleware(mockUserService);
    // Asegurar que headers está definido
    mockRequest = {
      headers: {
        authorization: undefined,
      },
      url: '/test',
      method: 'GET',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should return 401 if token is invalid', () => {
      mockRequest.headers.authorization = 'Bearer invalid_token';

      // Ejecutar el middleware
      authMiddleware.authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        ((error: Error | string | null) => {
          if (error) {
            authMiddleware.authMiddleware(
              mockRequest as Request,
              mockResponse as Response,
              mockNext
            );
          }
        }) as NextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);

      // Verificar el mensaje de error según el entorno
      if (config.server.nodeEnv === 'development') {
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid token',
            details: expect.any(String),
          })
        );
      } else {
        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Invalid token',
          details: undefined,
        });
      }
    });

    it('should call next if token is valid', (done) => {
      mockRequest.headers.authorization = 'Bearer valid_token';

      authMiddleware.authMiddleware(mockRequest as Request, mockResponse as Response, () => {
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockRequest.auth).toBeDefined();
        done();
      });
    });
  });

  describe('attachUser', () => {
    it('should attach user to request if user exists', async () => {
      mockRequest.auth = { sub: 'auth0|123', email: 'test@example.com' };
      const mockUser = new User('Test User', 'test@example.com', 'auth0|123');
      mockUserService.getUserByAuthProviderId.mockResolvedValue(mockUser);

      await authMiddleware.attachUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(mockUser.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user is not registered', async () => {
      mockRequest.auth = { sub: 'auth0|123', email: 'test@example.com' };
      mockUserService.getUserByAuthProviderId.mockResolvedValue(null);

      await authMiddleware.attachUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User not registered in the system' })
      );
    });
  });
});
