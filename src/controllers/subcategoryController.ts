import { Request, Response, NextFunction } from 'express';
import { SubcategoryService } from '../data/subcategoryService';
import { Subcategory } from '../models/Subcategory';
import { pool } from '../db';

const subcategoryService = new SubcategoryService(pool);

export const getSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subcategories = await subcategoryService.getAllSubcategories();
        res.json(subcategories);
    } catch (error) {
        next(error);
    }
};

export const addSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, categoryId } = req.body;
        const newSubcategory = new Subcategory(name, categoryId);
        const createdSubcategory = await subcategoryService.createSubcategory(newSubcategory);
        res.status(201).json(createdSubcategory);
    } catch (error) {
        next(error);
    }
};

export const updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, categoryId } = req.body;
        const updatedSubcategory = await subcategoryService.updateSubcategory(id, name, categoryId);
        if (!updatedSubcategory) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.json(updatedSubcategory);
    } catch (error) {
        next(error);
    }
};

export const deleteSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await subcategoryService.deleteSubcategory(id);
        if (result === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
