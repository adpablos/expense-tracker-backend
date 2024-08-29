import {NextFunction, Request, Response} from 'express';
import {inject, injectable} from 'inversify';
import {CategoryService} from '../services/categoryService';
import {Category} from '../models/Category';
import {TYPES} from '../types';

@injectable()
export class CategoryController {
    constructor(
        @inject(TYPES.CategoryService) private categoryService: CategoryService
    ) {}

    public getCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const categories = await this.categoryService.getAllCategories(req.currentHouseholdId);
            res.json(categories);
        } catch (error) {
            next(error);
        }
    };

    public addCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {name} = req.body;
            const newCategory = new Category(name, req.currentHouseholdId);
            const createdCategory = await this.categoryService.createCategory(newCategory);
            res.status(201).json(createdCategory);
        } catch (error) {
            next(error);
        }
    };

    public updateCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const {name} = req.body;
            const updatedCategory = await this.categoryService.updateCategory(id, name, req.currentHouseholdId);
            res.json(updatedCategory);
        } catch (error) {
            next(error);
        }
    };

    public deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const forceDelete = req.query.force === 'true';

            if (forceDelete) {
                await this.categoryService.deleteSubcategoriesByCategoryId(id, req.currentHouseholdId);
            }

            await this.categoryService.deleteCategory(id, req.currentHouseholdId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}