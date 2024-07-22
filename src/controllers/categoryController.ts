import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/categoryService';
import { Category } from '../models/Category';
import { pool } from '../db';
import { AppError } from '../utils/AppError';

const categoryService = new CategoryService(pool);

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

export const addCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body;
        const newCategory = new Category(name);
        const createdCategory = await categoryService.createCategory(newCategory);
        res.status(201).json(createdCategory);
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const updatedCategory = await categoryService.updateCategory(id, name);
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(updatedCategory);
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await categoryService.deleteCategory(id);
        if (result === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
