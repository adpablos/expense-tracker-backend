import 'reflect-metadata';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createApp } from '../../../../src/app';
import { DI_TYPES } from '../../../../src/types/di';
import { AppError } from '../../../../src/utils/AppError';
import { createTestContainer } from '../../../testContainer';
import { mockSubcategoryService, mockHouseholdService } from '../../mocks/serviceMocks';
import { mockUserId, mockHouseholdId } from '../../testUtils';

jest.mock('pg', () => require('../../mocks/pg'));

jest.mock('../../../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req, res, next) => next()),
  attachUser: jest.fn((req, res, next) => {
    req.user = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      authProviderId: 'auth0|123456',
    };
    req.currentHouseholdId = mockHouseholdId;
    next();
  }),
}));

const testContainer = createTestContainer();
testContainer.rebind(DI_TYPES.SubcategoryService).toConstantValue(mockSubcategoryService);
testContainer.rebind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
const app = createApp(testContainer);

describe('Subcategory Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/subcategories', () => {
    it('should return 403 when user does not have access to the specified household', async () => {
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .get('/api/subcategories')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });

    it('should return subcategories when user has access to the specified household', async () => {
      const mockSubcategories = [
        { id: uuidv4(), name: 'Subcategory 1', categoryId: uuidv4(), householdId: mockHouseholdId },
        { id: uuidv4(), name: 'Subcategory 2', categoryId: uuidv4(), householdId: mockHouseholdId },
      ];

      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);
      (mockSubcategoryService.getAllSubcategories as jest.Mock).mockResolvedValueOnce(
        mockSubcategories
      );

      const response = await request(app)
        .get('/api/subcategories')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubcategories);
    });
  });

  describe('POST /api/subcategories', () => {
    it('should create a new subcategory', async () => {
      const newSubcategory = { name: 'New Subcategory', categoryId: uuidv4() };
      const createdSubcategory = { id: uuidv4(), ...newSubcategory, householdId: mockHouseholdId };

      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);
      (mockSubcategoryService.createSubcategory as jest.Mock).mockResolvedValueOnce(
        createdSubcategory
      );

      const response = await request(app)
        .post('/api/subcategories')
        .send(newSubcategory)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdSubcategory);
    });

    it('should return 403 when user does not have access to the household', async () => {
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/subcategories')
        .send({ name: 'New Subcategory', categoryId: uuidv4() })
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });

  describe('PUT /api/subcategories/{id}', () => {
    it('should update an existing subcategory', async () => {
      const subcategoryId = uuidv4();
      const updateData = {
        name: 'Updated Subcategory Name',
        categoryId: uuidv4(),
      };

      const mockUpdatedSubcategory = {
        id: subcategoryId,
        ...updateData,
        householdId: mockHouseholdId,
      };

      (mockSubcategoryService.updateSubcategory as jest.Mock).mockResolvedValueOnce(
        mockUpdatedSubcategory
      );
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/subcategories/${subcategoryId}`)
        .send(updateData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedSubcategory);
    });

    it('should return 404 when subcategory is not found', async () => {
      const nonExistentSubcategoryId = uuidv4();
      const updateData = {
        name: 'Updated Subcategory Name',
        categoryId: uuidv4(),
      };

      (mockSubcategoryService.updateSubcategory as jest.Mock).mockRejectedValueOnce(
        new AppError('Subcategory not found', 404)
      );
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/subcategories/${nonExistentSubcategoryId}`)
        .send(updateData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Subcategory not found',
      });
    });

    it('should return 403 when user does not have access to the household', async () => {
      const subcategoryId = uuidv4();
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .put(`/api/subcategories/${subcategoryId}`)
        .send({ name: 'Updated Subcategory', categoryId: uuidv4() })
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });

  describe('DELETE /api/subcategories/{id}', () => {
    it('should delete an existing subcategory', async () => {
      const subcategoryId = uuidv4();

      (mockSubcategoryService.deleteSubcategory as jest.Mock).mockResolvedValueOnce(1);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/subcategories/${subcategoryId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(204);
    });

    it('should return 404 when subcategory is not found', async () => {
      const nonExistentSubcategoryId = uuidv4();

      (mockSubcategoryService.deleteSubcategory as jest.Mock).mockRejectedValueOnce(
        new AppError('Subcategory not found', 404)
      );
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/subcategories/${nonExistentSubcategoryId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Subcategory not found',
      });
    });

    it('should return 403 when user does not have access to the household', async () => {
      const subcategoryId = uuidv4();
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .delete(`/api/subcategories/${subcategoryId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });
});
