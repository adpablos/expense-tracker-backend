import { Request, Response, NextFunction } from 'express';
import { SubcategoryService } from '../data/subcategoryService';
import { Subcategory } from '../models/Subcategory';
import { pool } from '../config/db';
import logger from '../config/logger';

const subcategoryService = new SubcategoryService(pool);

export const getSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subcategories = await subcategoryService.getAllSubcategories();
        logger.info('Retrieved subcategories');
        res.json(subcategories);
    } catch (error) {
        logger.error('Error fetching subcategories: %s', error);
        next(error);
    }
};

export const addSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, categoryId } = req.body;
        const newSubcategory = new Subcategory(name, categoryId);
        const createdSubcategory = await subcategoryService.createSubcategory(newSubcategory);
        logger.info('Added new subcategory: %s', name);
        res.status(201).json(createdSubcategory);
    } catch (error) {
        logger.error('Error adding subcategory: %s', error);
        next(error);
    }
};

export const updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, categoryId } = req.body;
        const updatedSubcategory = await subcategoryService.updateSubcategory(id, name, categoryId);
        if (!updatedSubcategory) {
            logger.warn('Subcategory not found: %s', id);
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        logger.info('Updated subcategory: %s', id);
        res.json(updatedSubcategory);
    } catch (error) {
        logger.error('Error updating subcategory: %s', error);
        next(error);
    }
};

export const deleteSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await subcategoryService.deleteSubcategory(id);
        if (result === 0) {
            logger.warn('Subcategory not found: %s', id);
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        logger.info('Deleted subcategory: %s', id);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting subcategory: %s', error);
        next(error);
    }
};
