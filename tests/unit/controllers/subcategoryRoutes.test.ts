import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { DI_TYPES } from '../../../src/config/di';
import { SubcategoryController } from '../../../src/controllers/subcategoryController';
import { errorHandler } from '../../../src/middleware/errorHandler';
import subcategoryRoutes from '../../../src/routes/subcategoryRoutes';
import { AppError } from '../../../src/utils/AppError';
import { createMockAuthMiddleware, createMockHouseholdMiddleware } from '../mocks/middlewareMocks';
import { mockSubcategoryService, mockHouseholdService } from '../mocks/serviceMocks';

const mockHouseholdId = uuidv4();
const mockUserId = uuidv4();

// Mock middlewares
const mockAuthMiddleware = createMockAuthMiddleware(mockUserId);
const mockHouseholdMiddleware = createMockHouseholdMiddleware(mockHouseholdService);

const container = new Container();
container.bind(DI_TYPES.SubcategoryService).toConstantValue(mockSubcategoryService);
container.bind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
container.bind(DI_TYPES.AuthMiddleware).toConstantValue(mockAuthMiddleware);
container.bind(DI_TYPES.HouseholdMiddleware).toConstantValue(mockHouseholdMiddleware);
container.bind(DI_TYPES.SubcategoryController).to(SubcategoryController);

const app = express();
app.use(express.json());
app.use('/api/subcategories', subcategoryRoutes(container));
app.use(errorHandler);

describe('Subcategory Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockReset();
  });

  describe('GET /api/subcategories', () => {
    it('should return 403 when user does not have access to the specified household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

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

      mockHouseholdService.userHasAccessToHousehold.mockReturnValue(true);
      mockSubcategoryService.getAllSubcategories.mockResolvedValue(mockSubcategories);

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

      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);
      mockSubcategoryService.createSubcategory.mockResolvedValue(createdSubcategory);

      const response = await request(app)
        .post('/api/subcategories')
        .send(newSubcategory)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdSubcategory);
    });

    it('should return 403 when user does not have access to the household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

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

      mockSubcategoryService.updateSubcategory.mockResolvedValue(mockUpdatedSubcategory);
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

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

      mockSubcategoryService.updateSubcategory.mockRejectedValue(
        new AppError('Subcategory not found', 404)
      );
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

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
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

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

      mockSubcategoryService.deleteSubcategory.mockResolvedValue(1);
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/subcategories/${subcategoryId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(204);
    });

    it('should return 404 when subcategory is not found', async () => {
      const nonExistentSubcategoryId = uuidv4();

      mockSubcategoryService.deleteSubcategory.mockRejectedValue(
        new AppError('Subcategory not found', 404)
      );
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(true);

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
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

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
