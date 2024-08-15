import {NextFunction, Request, Response} from 'express';
import {SubcategoryService} from '../services/subcategoryService';
import {Subcategory} from '../models/Subcategory';
import pool from '../config/db';
import logger from '../config/logger';

const subcategoryService = new SubcategoryService(pool);

export const getSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subcategories = await subcategoryService.getAllSubcategories();
        res.json(subcategories);
    } catch (error) {
        logger.error('Error fetching subcategories: %s', error);
        next(error);
    }
};

export const addSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {name, categoryId} = req.body;
        const householdId = req.user?.householdId;

        if (!householdId) {
            return res.status(400).json({ message: 'User does not belong to a household' });
        }

        const newSubcategory = new Subcategory(name, categoryId, householdId);
        const createdSubcategory = await subcategoryService.createSubcategory(newSubcategory);
        res.status(201).json(createdSubcategory);
    } catch (error) {
        logger.error('Error adding subcategory: %s', error);
        next(error);
    }
};

export const updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {id} = req.params;
        const {name, categoryId} = req.body;
        const updatedSubcategory = await subcategoryService.updateSubcategory(id, name, categoryId);
        if (!updatedSubcategory) {
            logger.warn('Subcategory not found: %s', id);
            return res.status(404).json({message: 'Subcategory not found'});
        }
        res.json(updatedSubcategory);
    } catch (error) {
        logger.error('Error updating subcategory: %s', error);
        next(error);
    }
};

export const deleteSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {id} = req.params;
        const result = await subcategoryService.deleteSubcategory(id);
        if (result === 0) {
            logger.warn('Subcategory not found: %s', id);
            return res.status(404).json({message: 'Subcategory not found'});
        }
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting subcategory: %s', error);
        next(error);
    }
};
