import 'reflect-metadata';

import { Response, NextFunction } from 'express';

import { AuthMiddleware } from '../../../src/middleware/authMiddleware';
import { User } from '../../../src/models/User';
import { UserService } from '../../../src/services/userService';
import { ExtendedRequest } from '../../../src/types/express';

jest.mock('../../../src/services/userService');
jest.mock('express-jwt');
jest.mock('jwks-rsa');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<ExtendedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockUserService = {
      getUserByAuthProviderId: jest.fn(),
    } as unknown as jest.Mocked<UserService>;
    authMiddleware = new AuthMiddleware(mockUserService);
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should call next if token is valid', () => {
      const mockExpressJwt = jest.requireMock('express-jwt').expressjwt;
      mockExpressJwt.mockImplementation(
        () => (req: ExtendedRequest, res: Response, next: NextFunction) => next()
      );

      authMiddleware.authMiddleware(
        mockRequest as ExtendedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      const mockExpressJwt = jest.requireMock('express-jwt').expressjwt;
      mockExpressJwt.mockImplementation(
        () => (req: ExtendedRequest, res: Response, next: NextFunction) =>
          next(new Error('Invalid token'))
      );

      authMiddleware.authMiddleware(
        mockRequest as ExtendedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid token' })
      );
    });
  });

  describe('attachUser', () => {
    it('should attach user to request if user exists', async () => {
      mockRequest.auth = { sub: 'auth0|123', email: 'test@example.com' };
      const mockUser = new User('Test User', 'test@example.com', 'auth0|123');
      mockUserService.getUserByAuthProviderId.mockResolvedValue(mockUser);

      await authMiddleware.attachUser(
        mockRequest as ExtendedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(mockUser.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user is not registered', async () => {
      mockRequest.auth = { sub: 'auth0|123', email: 'test@example.com' };
      mockUserService.getUserByAuthProviderId.mockResolvedValue(null);

      await authMiddleware.attachUser(
        mockRequest as ExtendedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User not registered in the system' })
      );
    });
  });
});
