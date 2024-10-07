import { Pool } from 'pg';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createApp } from '../../src/app';
import { Subcategory } from '../../src/models/Subcategory';
import { DI_TYPES } from '../../src/config/di';

import { mockMiddlewares } from './mocks/mockMiddlewares';
import { container } from './setup/jest.setup';

let app: ReturnType<typeof createApp>;
let pool: Pool;

describe('Subcategories API Integration Tests', () => {
  beforeAll(() => {
    mockMiddlewares();
    app = createApp(container);
    pool = container.get<Pool>(DI_TYPES.DbPool);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM subcategories');
    await pool.query('DELETE FROM categories');
  });

  describe('POST /api/subcategories', () => {
    it('should create a new subcategory', async () => {
      // Primero, crear una categoría padre
      const categoryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Parent Category' });

      const categoryId = categoryResponse.body.id;

      const response = await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Groceries', categoryId });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Groceries');
      expect(response.body.id).toBeDefined();
      expect(response.body.categoryId).toBe(categoryId);
      expect(response.body.householdId).toBeDefined();
    });

    it('should return 400 if subcategory name is missing', async () => {
      const response = await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ categoryId: uuidv4() });

      expect(response.status).toBe(400);
    });

    it('should return 400 if category ID is missing', async () => {
      const response = await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Test Subcategory' });

      expect(response.status).toBe(400);
    });

    it('should return 404 if parent category does not exist', async () => {
      const response = await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Test Subcategory', categoryId: uuidv4() });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/subcategories', () => {
    it('should retrieve all subcategories', async () => {
      // Crear una categoría padre
      const categoryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Parent Category' });

      const categoryId = categoryResponse.body.id;

      // Crear subcategorías
      await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Groceries', categoryId });
      await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Restaurants', categoryId });

      const response = await request(app)
        .get('/api/subcategories')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body.map((s: Subcategory) => s.name)).toContain('Groceries');
      expect(response.body.map((s: Subcategory) => s.name)).toContain('Restaurants');
    });

    it('should return an empty array if no subcategories exist', async () => {
      const response = await request(app)
        .get('/api/subcategories')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/subcategories/:id', () => {
    it('should update an existing subcategory', async () => {
      // Crear una categoría padre
      const categoryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Parent Category' });

      const categoryId = categoryResponse.body.id;

      // Crear una subcategoría
      const createResponse = await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Old Name', categoryId });

      const subcategoryId = createResponse.body.id;

      // Actualizar la subcategoría
      const updateResponse = await request(app)
        .put(`/api/subcategories/${subcategoryId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'New Name', categoryId });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('New Name');
      expect(updateResponse.body.id).toBe(subcategoryId);
      expect(updateResponse.body.categoryId).toBe(categoryId);
    });

    it('should return 404 if subcategory does not exist', async () => {
      const nonExistentId = uuidv4();
      const response = await request(app)
        .put(`/api/subcategories/${nonExistentId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'New Name', categoryId: uuidv4() });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/subcategories/:id', () => {
    it('should delete an existing subcategory', async () => {
      // Crear una categoría padre
      const categoryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'Parent Category' });

      const categoryId = categoryResponse.body.id;

      // Crear una subcategoría
      const createResponse = await request(app)
        .post('/api/subcategories')
        .set('Authorization', 'Bearer fake-token')
        .send({ name: 'To Be Deleted', categoryId });

      const subcategoryId = createResponse.body.id;

      // Eliminar la subcategoría
      const deleteResponse = await request(app)
        .delete(`/api/subcategories/${subcategoryId}`)
        .set('Authorization', 'Bearer fake-token');

      expect(deleteResponse.status).toBe(204);

      // Verificar que la subcategoría ya no existe
      const getResponse = await request(app)
        .get('/api/subcategories')
        .set('Authorization', 'Bearer fake-token');

      expect(getResponse.body.length).toBe(0);
    });

    it('should return 404 if subcategory does not exist', async () => {
      const nonExistentId = uuidv4();
      const response = await request(app)
        .delete(`/api/subcategories/${nonExistentId}`)
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(404);
    });
  });
});
