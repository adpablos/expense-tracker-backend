// src/services/fileProcessors/FileProcessor.ts
import { Expense } from '../../models/Expense';
import { ExtendedRequest } from '../../types/express';

export interface FileProcessor {
  canProcess(file: Express.Multer.File): boolean;
  process(file: Express.Multer.File, req: ExtendedRequest): Promise<Expense | null>;
}
