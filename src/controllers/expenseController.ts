import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';

import { DI_TYPES } from '../config/di';
import { Expense } from '../models/Expense';
import { ExpenseService } from '../services/expenseService';
import { OpenAIService } from '../services/external/openaiService';
import { FileProcessorFactory } from '../services/fileProcessors/FileProcessorFactory';
import { AppError } from '../utils/AppError';

@injectable()
export class ExpenseController {
  constructor(
    @inject(DI_TYPES.ExpenseService) private expenseService: ExpenseService,
    @inject(DI_TYPES.OpenAIService) private openAIService: OpenAIService,
    @inject(DI_TYPES.FileProcessorFactory) private fileProcessorFactory: FileProcessorFactory
  ) {}

  public getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        startDate,
        endDate,
        category,
        subcategory,
        amount,
        description,
        page = 1,
        limit = 10,
      } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        category: category as string,
        subcategory: subcategory as string,
        amount: amount ? parseFloat(amount as string) : undefined,
        description: description as string,
        householdId: req.currentHouseholdId!,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };
      const { expenses, totalItems } = await this.expenseService.getExpenses(filters);
      res.json({
        page: filters.page,
        totalPages: Math.ceil(totalItems / filters.limit),
        totalItems,
        expenses,
      });
    } catch (error) {
      next(error);
    }
  };

  public addExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { description, amount, category, subcategory, expenseDatetime } = req.body;
      const newExpense = new Expense(
        description,
        amount,
        category,
        subcategory,
        req.currentHouseholdId!,
        new Date(expenseDatetime)
      );
      const createdExpense = await this.expenseService.createExpense(newExpense, req.user!.id);
      res.status(201).json(createdExpense);
    } catch (error) {
      next(error);
    }
  };

  public updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { description, amount, category, subcategory, expenseDatetime } = req.body;
      const updatedExpense = await this.expenseService.updateExpense(
        id,
        {
          description,
          amount,
          category,
          subcategory,
          expenseDatetime: new Date(expenseDatetime),
          householdId: req.currentHouseholdId,
        },
        req.currentHouseholdId!,
        req.user!.id
      );
      if (!updatedExpense) {
        res.status(404).json({ message: 'Expense not found' });
      }
      res.json(updatedExpense);
    } catch (error) {
      next(error);
    }
  };

  public deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.expenseService.deleteExpense(id, req.currentHouseholdId!, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handles the upload and processing of files to create expenses using AI.
   * @param req Request that includes user and household information.
   * @param res Express response.
   * @param next Express next function.
   */
  public uploadExpense = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const householdId = req.currentHouseholdId;
    if (!householdId) {
      return next(new AppError('User does not belong to a household', 400));
    }

    try {
      const processor = this.fileProcessorFactory.getProcessor(req.file);
      if (!processor) {
        return next(new AppError('Unsupported file type', 400));
      }

      const expenseDetails = await processor.process(req.file, req);

      if (expenseDetails) {
        res.status(200).json({ message: 'Expense logged successfully.', expense: expenseDetails });
      } else {
        res.status(422).json({
          message: 'No expense logged.',
          details: 'The file was processed successfully, but no valid expense could be identified.',
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
