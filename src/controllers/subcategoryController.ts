import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';

import { DI_TYPES } from '../config/di';
import { Subcategory } from '../models/Subcategory';
import { SubcategoryService } from '../services/subcategoryService';

@injectable()
export class SubcategoryController {
  constructor(
    @inject(DI_TYPES.SubcategoryService) private subcategoryService: SubcategoryService
  ) {}

  public getSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subcategories = await this.subcategoryService.getAllSubcategories(
        req.currentHouseholdId!
      );
      res.json(subcategories);
    } catch (error) {
      next(error);
    }
  };

  public addSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, categoryId } = req.body;
      const newSubcategory = new Subcategory(name, categoryId, req.currentHouseholdId!);
      const createdSubcategory = await this.subcategoryService.createSubcategory(newSubcategory);
      res.status(201).json(createdSubcategory);
    } catch (error) {
      next(error);
    }
  };

  public updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, categoryId } = req.body;
      const updatedSubcategory = await this.subcategoryService.updateSubcategory(
        id,
        name,
        categoryId,
        req.currentHouseholdId!
      );
      res.json(updatedSubcategory);
    } catch (error) {
      next(error);
    }
  };

  public deleteSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.subcategoryService.deleteSubcategory(id, req.currentHouseholdId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
