// src/services/fileProcessors/FileProcessorFactory.ts
import { injectable, inject, named } from 'inversify';

import { DI_TYPES } from '../../types/di';
import { AppError } from '../../utils/AppError';

import { AudioProcessor } from './AudioProcessor';
import { FileProcessor } from './FileProcessor';
import { ImageProcessor } from './ImageProcessor';

@injectable()
export class FileProcessorFactory {
  constructor(
    @inject(DI_TYPES.FileProcessor) @named('ImageProcessor') private imageProcessor: ImageProcessor,
    @inject(DI_TYPES.FileProcessor) @named('AudioProcessor') private audioProcessor: AudioProcessor
  ) {}

  public getProcessor(file: Express.Multer.File): FileProcessor {
    if (file.mimetype.startsWith('image/')) {
      return this.imageProcessor;
    } else if (file.mimetype.startsWith('audio/')) {
      return this.audioProcessor;
    } else {
      throw new AppError('Unsupported file type', 400);
    }
  }
}
