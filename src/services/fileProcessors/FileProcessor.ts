// src/services/fileProcessors/FileProcessor.ts
import { Request } from 'express';

import { Expense } from '../../models/Expense';

export interface FileProcessor {
  canProcess(file: Express.Multer.File): boolean;
  process(file: Express.Multer.File, req: Request): Promise<Expense | null>;
}
