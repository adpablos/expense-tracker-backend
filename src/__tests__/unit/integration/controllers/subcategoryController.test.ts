// src/__tests__/unit/integration/controllers/subcategoryController.test.ts

import { Request, Response } from 'express';
import { SubcategoryService } from '../../../../services/subcategoryService';
import { getSubcategories, addSubcategory, updateSubcategory, deleteSubcategory } from '../../../../controllers/subcategoryController';
import { Subcategory } from '../../../../models/Subcategory';

jest.mock('../../../../services/subcategoryService');
jest.mock('../../../../config/logger');

describe('SubcategoryController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockRequest = {
            currentHouseholdId: 'household-123',
            body: {},
            params: {},
        };
        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('getSubcategories', () => {
        it('should return all subcategories for a household', async () => {
            const mockSubcategories = [
                new Subcategory('Subcategory 1', 'category-123', 'household-123'),
                new Subcategory('Subcategory 2', 'category-123', 'household-123'),
            ];

            (SubcategoryService.prototype.getAllSubcategories as jest.Mock).mockResolvedValueOnce(mockSubcategories);

            await getSubcategories(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(mockSubcategories);
        });

        it('should call next with error if service throws', async () => {
            const error = new Error('Database error');
            (SubcategoryService.prototype.getAllSubcategories as jest.Mock).mockRejectedValueOnce(error);

            await getSubcategories(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('addSubcategory', () => {
        it('should create a new subcategory', async () => {
            const newSubcategory = new Subcategory('New Subcategory', 'category-123', 'household-123');
            mockRequest.body = { name: 'New Subcategory', categoryId: 'category-123' };

            (SubcategoryService.prototype.createSubcategory as jest.Mock).mockResolvedValueOnce(newSubcategory);

            await addSubcategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(newSubcategory);
        });

        it('should call next with error if service throws', async () => {
            mockRequest.body = { name: 'New Subcategory', categoryId: 'category-123' };
            const error = new Error('Database error');
            (SubcategoryService.prototype.createSubcategory as jest.Mock).mockRejectedValueOnce(error);

            await addSubcategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateSubcategory', () => {
        it('should update an existing subcategory', async () => {
            const updatedSubcategory = new Subcategory('Updated Subcategory', 'category-123', 'household-123');
            mockRequest.params = { id: 'subcategory-123' };
            mockRequest.body = { name: 'Updated Subcategory', categoryId: 'category-123' };

            (SubcategoryService.prototype.updateSubcategory as jest.Mock).mockResolvedValueOnce(updatedSubcategory);

            await updateSubcategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(updatedSubcategory);
        });

        it('should return 404 if subcategory not found', async () => {
            mockRequest.params = { id: 'non-existent-subcategory' };
            mockRequest.body = { name: 'Updated Subcategory', categoryId: 'category-123' };

            (SubcategoryService.prototype.updateSubcategory as jest.Mock).mockResolvedValueOnce(null);

            await updateSubcategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Subcategory not found' });
        });
    });

    describe('deleteSubcategory', () => {
        it('should delete a subcategory', async () => {
            mockRequest.params = { id: 'subcategory-123' };

            (SubcategoryService.prototype.deleteSubcategory as jest.Mock).mockResolvedValueOnce(1);

            await deleteSubcategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(204);
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should return 404 if subcategory not found', async () => {
            mockRequest.params = { id: 'non-existent-subcategory' };

            (SubcategoryService.prototype.deleteSubcategory as jest.Mock).mockResolvedValueOnce(0);

            await deleteSubcategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Subcategory not found' });
        });
    });
});