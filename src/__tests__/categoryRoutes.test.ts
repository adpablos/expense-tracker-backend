import request from 'supertest';
import express from 'express';
import categoryRoutes from '../routes/categoryRoutes';
import { pool } from '../config/db';

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('Category Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    let categoryId: string;

    it('should create a new category', async () => {
        const mockCategory = { id: '1', name: 'Test Category' };
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCategory] });

        const res = await request(app)
            .post('/api/categories')
            .send({ name: 'Test Category' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toEqual('Test Category');

        categoryId = res.body.id;
    });

    it('should get all categories', async () => {
        const mockCategories = [{ id: '1', name: 'Test Category' }];
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockCategories });

        const res = await request(app).get('/api/categories');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should update an existing category', async () => {
        const mockCategory = { id: '1', name: 'Updated Test Category' };
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockCategory] });

        const res = await request(app)
            .put(`/api/categories/${categoryId}`)
            .send({ name: 'Updated Test Category' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toEqual('Updated Test Category');
    });

    it('should delete an existing category', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).delete(`/api/categories/${categoryId}`);
        expect(res.statusCode).toEqual(204);
    });

    it('should return 404 when trying to update a non-existent category', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .put('/api/categories/9999')
            .send({ name: 'Non-existent Category' });
        expect(res.statusCode).toEqual(404);
    });

    it('should return 400 when creating a category with invalid data', async () => {
        const res = await request(app)
            .post('/api/categories')
            .send({ name: '' });
        expect(res.statusCode).toEqual(400);
    });
});
