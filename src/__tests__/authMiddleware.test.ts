import { Request, Response, NextFunction } from 'express';
import { attachUser } from '../middleware/authMiddleware';
import { UserService } from '../services/userService';
import { User } from '../models/User';

jest.mock('../services/userService');
jest.mock('express-jwt');
jest.mock('jwks-rsa');

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    test('attachUser should attach user to request if auth is present', async () => {
        const mockUser = new User('test@example.com', 'auth0|123456');
        (UserService.prototype.getUserByAuthProviderId as jest.Mock).mockResolvedValue(mockUser);

        mockRequest.auth = {email: "", sub: 'auth0|123456' };

        await attachUser(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.user).toEqual(mockUser);
        expect(nextFunction).toHaveBeenCalled();
    });

    test('attachUser should return 401 if no auth is present', async () => {
        await attachUser(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No authentication token provided' });
    });

    // Añade más pruebas según sea necesario
});