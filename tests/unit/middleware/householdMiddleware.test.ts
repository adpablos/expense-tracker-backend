import 'reflect-metadata';

import { Request, Response, NextFunction } from 'express';

import { HouseholdMiddleware } from '../../../src/middleware/householdMiddleware';
import { Household } from '../../../src/models/Household';
import { User } from '../../../src/models/User';
import { HouseholdService } from '../../../src/services/householdService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/services/householdService');

describe('HouseholdMiddleware', () => {
  let householdMiddleware: HouseholdMiddleware;
  let mockHouseholdService: jest.Mocked<HouseholdService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockHouseholdService = {
      userHasAccessToHousehold: jest.fn(),
      getDefaultHouseholdForUser: jest.fn(),
    } as unknown as jest.Mocked<HouseholdService>;
    householdMiddleware = new HouseholdMiddleware(mockHouseholdService);
    mockRequest = {
      header: jest.fn(),
      user: new User('Test User', 'test@example.com', 'auth0|123'),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('setCurrentHousehold', () => {
    it('should set current household from header if user has access', async () => {
      (mockRequest.header as jest.Mock).mockReturnValue('household1');
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

      await householdMiddleware.setCurrentHousehold(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.currentHouseholdId).toBe('household1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set default household if no household ID in header', async () => {
      (mockRequest.header as jest.Mock).mockReturnValue(null);
      const mockHousehold = new Household('Default Household');
      mockHouseholdService.getDefaultHouseholdForUser.mockResolvedValue(mockHousehold);

      await householdMiddleware.setCurrentHousehold(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.currentHouseholdId).toBe(mockHousehold.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next with error if user does not have access to household', async () => {
      (mockRequest.header as jest.Mock).mockReturnValue('household1');
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      await householdMiddleware.setCurrentHousehold(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('ensureHouseholdSelected', () => {
    it('should call next if household is selected', () => {
      mockRequest.currentHouseholdId = 'household1';

      householdMiddleware.ensureHouseholdSelected(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next with error if no household is selected', () => {
      householdMiddleware.ensureHouseholdSelected(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
