// src/services/fileProcessors/ImageProcessor.ts
import { Request } from 'express';
import { inject, injectable } from 'inversify';

import { Expense } from '../../models/Expense';
import { DI_TYPES } from '../../types/di';
import { AppError } from '../../utils/AppError';
import { encodeImage } from '../../utils/encodeImage';
import { OpenAIService } from '../external/openaiService';

import { FileProcessor } from './FileProcessor';

@injectable()
export class ImageProcessor implements FileProcessor {
  constructor(@inject(DI_TYPES.OpenAIService) private openAIService: OpenAIService) {}

  public canProcess(file: Express.Multer.File): boolean {
    return file.mimetype.startsWith('image/');
  }

  public async process(file: Express.Multer.File, req: Request): Promise<Expense | null> {
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const householdId = req.currentHouseholdId;
    const userId = req.user?.id;

    if (!householdId || !userId) {
      throw new AppError('Missing household or user information', 400);
    }

    let base64Image: string;
    try {
      if (file.buffer) {
        // memoryStorage
        base64Image = file.buffer.toString('base64');
      } else if (file.path) {
        // diskStorage
        base64Image = encodeImage(file.path);
      } else {
        throw new AppError('No file data available', 400);
      }
    } catch (error) {
      throw new AppError('Error processing image file', 400);
    }

    const expenseDetails = await this.openAIService.processReceipt(
      base64Image,
      householdId,
      userId
    );
    return expenseDetails;
  }
}
