import { Pool } from 'pg';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createApp } from '../../src/app';
import logger from '../../src/config/logger';
import { Category } from '../../src/models/Category';
import { DI_TYPES } from '../../src/config/di';

import { logDatabaseState } from './helpers';
import { mockMiddlewares } from './mocks/mockMiddlewares';
import { container } from './setup/jest.setup';

describe('Categories API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let pool: Pool;

  beforeAll(async () => {
    logger.testSuite('Categories API Integration Tests');
    try {
      mockMiddlewares();
      app = createApp(container);
      pool = container.get<Pool>(DI_TYPES.DbPool);
    } catch (error) {
      logger.error('Test setup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM subcategories');
    await pool.query('DELETE FROM categories');
  });

  describe('POST /api/categories', () => {
    beforeAll(() => {
      logger.testDescribe('POST /api/categories');
    });

    it('should create a new category', async () => {
      logger.testCase('should create a new category');
      await logDatabaseState(pool);

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Utilities' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Utilities');
      expect(response.body.id).toBeDefined();
      expect(response.body.householdId).toBeDefined();
    });

    it('should return 400 if category name is missing', async () => {
      logger.testCase('should return 400 if category name is missing');
      await logDatabaseState(pool);

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 if category name is empty', async () => {
      logger.testCase('should return 400 if category name is empty');
      await logDatabaseState(pool);

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    beforeAll(() => {
      logger.testDescribe('GET /api/categories');
    });

    it('should retrieve all categories', async () => {
      logger.testCase('should retrieve all categories');
      await logDatabaseState(pool);

      await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Food' });
      await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Transport' });

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body.map((c: Category) => c.name)).toContain('Food');
      expect(response.body.map((c: Category) => c.name)).toContain('Transport');
    });

    it('should return an empty array if no categories exist', async () => {
      logger.testCase('should return an empty array if no categories exist');
      await logDatabaseState(pool);

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/categories/:id', () => {
    beforeAll(() => {
      logger.testDescribe('PUT /api/categories/:id');
    });

    it('should update an existing category', async () => {
      logger.testCase('should update an existing category');
      await logDatabaseState(pool);

      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Old Name' });

      const categoryId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'New Name' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('New Name');
      expect(updateResponse.body.id).toBe(categoryId);
    });

    it('should return 404 if category does not exist', async () => {
      logger.testCase('should return 404 if category does not exist');
      await logDatabaseState(pool);

      const nonExistentId = uuidv4();
      const response = await request(app)
        .put(`/api/categories/${nonExistentId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    beforeAll(() => {
      logger.testDescribe('DELETE /api/categories/:id');
    });

    it('should delete an existing category without subcategories', async () => {
      logger.testCase('should delete an existing category without subcategories');
      await logDatabaseState(pool);

      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'To Be Deleted' });

      const categoryId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', 'Bearer fake-token');

      expect(deleteResponse.status).toBe(204);

      const getResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer fake-token');

      expect(getResponse.body.length).toBe(0);
    });

    it('should return 400 if category has subcategories', async () => {
      logger.testCase('should return 400 if category has subcategories');
      await logDatabaseState(pool);

      const createCategoryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Parent Category' });

      const categoryId = createCategoryResponse.body.id;

      // Crear una subcategoría (asumiendo que existe un endpoint para esto)
      await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Child Subcategory', categoryId });

      const deleteResponse = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', 'Bearer fake-token');

      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.body.message).toContain(
        'Cannot delete category with associated subcategories'
      );
    });

    it('should return 404 if category does not exist', async () => {
      logger.testCase('should return 404 if category does not exist');
      await logDatabaseState(pool);

      const nonExistentId = uuidv4();
      const response = await request(app)
        .delete(`/api/categories/${nonExistentId}`)
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(404);
    });
  });
});
