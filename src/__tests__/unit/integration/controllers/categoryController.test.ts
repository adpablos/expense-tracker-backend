import { Request, Response } from 'express';
import { CategoryService } from '../../../../services/categoryService';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../../../controllers/categoryController';
import { Category } from '../../../../models/Category';
import { AppError } from '../../../../utils/AppError';

jest.mock('../../../../services/categoryService');
jest.mock('../../../../config/logger');

describe('CategoryController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockRequest = {
            params: {},
            query: {},
            currentHouseholdId: 'mock-household-id',
        };
        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('getCategories', () => {
        it('should return all categories for a household', async () => {
            const mockCategories = [
                new Category('Category 1', 'household-123'),
                new Category('Category 2', 'household-123'),
            ];

            (CategoryService.prototype.getAllCategories as jest.Mock).mockResolvedValueOnce(mockCategories);

            await getCategories(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(mockCategories);
        });

        it('should call next with error if service throws', async () => {
            const error = new Error('Database error');
            (CategoryService.prototype.getAllCategories as jest.Mock).mockRejectedValueOnce(error);

            await getCategories(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('addCategory', () => {
        it('should create a new category', async () => {
            const newCategory = new Category('New Category', 'household-123');
            mockRequest.body = { name: 'New Category' };

            (CategoryService.prototype.createCategory as jest.Mock).mockResolvedValueOnce(newCategory);

            await addCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(newCategory);
        });

        it('should call next with error if service throws', async () => {
            mockRequest.body = { name: 'New Category' };
            const error = new AppError('Invalid category data', 400);
            (CategoryService.prototype.createCategory as jest.Mock).mockRejectedValueOnce(error);

            await addCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('updateCategory', () => {
        it('should update an existing category', async () => {
            const updatedCategory = new Category('Updated Category', 'household-123');
            mockRequest.params = { id: 'category-123' };
            mockRequest.body = { name: 'Updated Category' };

            (CategoryService.prototype.updateCategory as jest.Mock).mockResolvedValueOnce(updatedCategory);

            await updateCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(updatedCategory);
        });

        it('should return 404 if category not found', async () => {
            mockRequest.params = { id: 'non-existent-category' };
            mockRequest.body = { name: 'Updated Category' };

            (CategoryService.prototype.updateCategory as jest.Mock).mockResolvedValueOnce(null);

            await updateCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Category not found' });
        });
    });

    describe('deleteCategory', () => {
        it('should delete a category', async () => {
            mockRequest.params = { id: 'category-123' };

            (CategoryService.prototype.deleteCategory as jest.Mock).mockResolvedValueOnce(1);

            await deleteCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(204);
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should return 404 if category not found', async () => {
            mockRequest.params = { id: 'non-existent-category' };

            (CategoryService.prototype.deleteCategory as jest.Mock).mockResolvedValueOnce(0);

            await deleteCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Category not found' });
        });

        it('should delete subcategories if force is true', async () => {
            mockRequest.params = { id: 'category-123' };
            mockRequest.query = { force: 'true' };

            (CategoryService.prototype.deleteSubcategoriesByCategoryId as jest.Mock).mockResolvedValueOnce(2);
            (CategoryService.prototype.deleteCategory as jest.Mock).mockResolvedValueOnce(1);

            await deleteCategory(mockRequest as Request, mockResponse as Response, mockNext);

            expect(CategoryService.prototype.deleteSubcategoriesByCategoryId).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(204);
        });
    });
});