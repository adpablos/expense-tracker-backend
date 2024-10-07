import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { DI_TYPES } from '../../../src/config/di';
import { CategoryController } from '../../../src/controllers/categoryController';
import { errorHandler } from '../../../src/middleware/errorHandler';
import categoryRoutes from '../../../src/routes/categoryRoutes';
import { AppError } from '../../../src/utils/AppError';
import { createMockAuthMiddleware, createMockHouseholdMiddleware } from '../mocks/middlewareMocks';
import { mockCategoryService, mockHouseholdService } from '../mocks/serviceMocks';

const mockHouseholdId = uuidv4();
const mockUserId = uuidv4();

// Mock middlewares
const mockAuthMiddleware = createMockAuthMiddleware(mockUserId);
const mockHouseholdMiddleware = createMockHouseholdMiddleware(mockHouseholdService);

const container = new Container();
container.bind(DI_TYPES.CategoryService).toConstantValue(mockCategoryService);
container.bind(DI_TYPES.HouseholdService).toConstantValue(mockHouseholdService);
container.bind(DI_TYPES.AuthMiddleware).toConstantValue(mockAuthMiddleware);
container.bind(DI_TYPES.HouseholdMiddleware).toConstantValue(mockHouseholdMiddleware);
container.bind(DI_TYPES.CategoryController).to(CategoryController);

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes(container));
app.use(errorHandler);

describe('Category Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockReset();
  });

  describe('GET /api/categories', () => {
    it('should return 403 when user does not have access to the specified household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });

    it('should return categories when user has access to the specified household', async () => {
      const mockCategories = [
        { id: uuidv4(), name: 'Category 1', householdId: mockHouseholdId },
        { id: uuidv4(), name: 'Category 2', householdId: mockHouseholdId },
      ];

      mockHouseholdService.userHasAccessToHousehold.mockReturnValue(true);
      mockCategoryService.getAllCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const newCategory = { name: 'New Category' };
      const createdCategory = { id: uuidv4(), ...newCategory, householdId: mockHouseholdId };

      mockHouseholdService.userHasAccessToHousehold.mockReturnValue(true);
      mockCategoryService.createCategory.mockResolvedValue(createdCategory);

      const response = await request(app)
        .post('/api/categories')
        .send(newCategory)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(mockCategoryService.createCategory).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdCategory);
    });

    it('should return 403 when user does not have access to the household', async () => {
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'New Category' })
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });

  describe('PUT /api/categories/{id}', () => {
    it('should update an existing category', async () => {
      const categoryId = uuidv4();
      const updateData = {
        name: 'Updated Category Name',
      };

      const mockUpdatedCategory = {
        id: categoryId,
        name: updateData.name,
        householdId: mockHouseholdId,
      };

      (mockCategoryService.updateCategory as jest.Mock).mockResolvedValueOnce(mockUpdatedCategory);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .send(updateData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedCategory);
    });

    it('should return 404 when category is not found', async () => {
      const nonExistentCategoryId = uuidv4();
      const updateData = {
        name: 'Updated Category Name',
      };

      (mockCategoryService.updateCategory as jest.Mock).mockRejectedValueOnce(
        new AppError('Category not found', 404)
      );
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/categories/${nonExistentCategoryId}`)
        .send(updateData)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Category not found',
      });
    });

    it('should return 403 when user does not have access to the household', async () => {
      const categoryId = uuidv4();
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .send({ name: 'Updated Category' })
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        'message',
        'User does not have access to this household'
      );
    });
  });

  describe('DELETE /api/categories/{id}', () => {
    it('should delete an existing category', async () => {
      const categoryId = uuidv4();

      (mockCategoryService.deleteCategory as jest.Mock).mockResolvedValueOnce(1);
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(204);
    });

    it('should return 404 when category is not found', async () => {
      const nonExistentCategoryId = uuidv4();

      (mockCategoryService.deleteCategory as jest.Mock).mockRejectedValueOnce(
        new AppError('Category not found', 404)
      );
      (mockHouseholdService.userHasAccessToHousehold as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/categories/${nonExistentCategoryId}`)
        .set('Authorization', 'Bearer mockToken')
        .set('X-Household-Id', mockHouseholdId);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Category not found',
      });
    });

    it('should return 403 when user does not have access to the household', async () => {
      const categoryId = uuidv4();
      mockHouseholdService.userHasAccessToHousehold.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
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
