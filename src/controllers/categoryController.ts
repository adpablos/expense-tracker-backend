import {NextFunction, Request, Response} from 'express';
import {CategoryService} from '../data/categoryService';
import {Category} from '../models/Category';
import pool from '../config/db';
import logger from '../config/logger';

const categoryService = new CategoryService(pool);

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json(categories);
    } catch (error) {
        logger.error('Error fetching categories: %s', error);
        next(error);
    }
};

export const addCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {name} = req.body;
        const newCategory = new Category(name);
        const createdCategory = await categoryService.createCategory(newCategory);
        res.status(201).json(createdCategory);
    } catch (error) {
        logger.error('Error adding category: %s', error);
        next(error);
    }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {id} = req.params;
        const {name} = req.body;
        const updatedCategory = await categoryService.updateCategory(id, name);
        if (!updatedCategory) {
            logger.warn('Category not found: %s', id);
            return res.status(404).json({message: 'Category not found'});
        }
        res.json(updatedCategory);
    } catch (error) {
        logger.error('Error updating category: %s', error);
        next(error);
    }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const forceDelete = req.query.force === 'true';

        if (forceDelete) {
            // Delete subcategories associated first
            await categoryService.deleteSubcategoriesByCategoryId(id);
        }

        const result = await categoryService.deleteCategory(id);
        if (result === 0) {
            logger.warn('Category not found: %s', id);
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
