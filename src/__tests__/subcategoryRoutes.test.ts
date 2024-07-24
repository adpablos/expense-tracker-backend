import request from 'supertest';
import express from 'express';
import subcategoryRoutes from '../routes/subcategoryRoutes';
import { pool } from '../config/db';

const app = express();
app.use(express.json());
app.use('/api/subcategories', subcategoryRoutes);

describe('Subcategory Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    let subcategoryId: string;

    it('should create a new subcategory', async () => {
        const mockSubcategory = { id: '1', name: 'Test Subcategory', category_id: '1' };
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSubcategory] });

        const res = await request(app)
            .post('/api/subcategories')
            .send({ name: 'Test Subcategory', categoryId: '1' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toEqual('Test Subcategory');

        subcategoryId = res.body.id;
    });

    it('should get all subcategories', async () => {
        const mockSubcategories = [{ id: '1', name: 'Test Subcategory', category_id: '1' }];
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockSubcategories });

        const res = await request(app).get('/api/subcategories');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should update an existing subcategory', async () => {
        const mockSubcategory = { id: '1', name: 'Updated Test Subcategory', category_id: '1' };
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSubcategory] });

        const res = await request(app)
            .put(`/api/subcategories/${subcategoryId}`)
            .send({ name: 'Updated Test Subcategory', categoryId: '1' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toEqual('Updated Test Subcategory');
    });

    it('should delete an existing subcategory', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).delete(`/api/subcategories/${subcategoryId}`);
        expect(res.statusCode).toEqual(204);
    });

    it('should return 404 when trying to update a non-existent subcategory', async () => {
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .put('/api/subcategories/9999')
            .send({ name: 'Non-existent Subcategory', categoryId: '1' });
        expect(res.statusCode).toEqual(404);
    });

    it('should return 400 when creating a subcategory with invalid data', async () => {
        const res = await request(app)
            .post('/api/subcategories')
            .send({ name: '', categoryId: '1' });
        expect(res.statusCode).toEqual(400);
    });
});
