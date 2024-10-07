// src/services/fileProcessors/AudioProcessor.ts
import { Request } from 'express';
import { inject, injectable } from 'inversify';

import logger from '../../config/logger';
import { Expense } from '../../models/Expense';
import { DI_TYPES } from '../../config/di';
import { AppError } from '../../utils/AppError';
import { OpenAIService } from '../external/openaiService';

import { AudioConverter } from './AudioConverter';
import { FileProcessor } from './FileProcessor';
import { TempFileHandler } from './TempFileHandler';

@injectable()
export class AudioProcessor implements FileProcessor {
  constructor(
    @inject(DI_TYPES.OpenAIService) private openAIService: OpenAIService,
    @inject(DI_TYPES.TempFileHandler) private tempFileHandler: TempFileHandler,
    @inject(DI_TYPES.AudioConverter) private audioConverter: AudioConverter
  ) {}

  public canProcess(file: Express.Multer.File): boolean {
    return file.mimetype.startsWith('audio/');
  }

  public async process(file: Express.Multer.File, req: Request): Promise<Expense | null> {
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const tempFiles: string[] = [];
    let audioPath: string | undefined;
    let wavFilePath: string | undefined;

    try {
      audioPath = this.getAudioPath(file, tempFiles);
      await this.verifyAudio(audioPath);
      wavFilePath = await this.convertAudio(audioPath, tempFiles);
      const householdId = req.currentHouseholdId;
      const userId = req.user?.id;

      if (!householdId || !userId) {
        throw new AppError('Missing household or user information', 400);
      }

      const transcription = await this.transcribeAudio(wavFilePath);
      const expenseDetails = await this.analyzeTranscription(transcription, householdId, userId);
      return expenseDetails;
    } catch (error) {
      logger.error('Error processing audio file:', error);
      throw error;
    } finally {
      this.cleanupFiles(file, wavFilePath, tempFiles);
    }
  }

  /**
   * Determine the path of the audio file based on the storage type.
   * @param file The uploaded file.
   * @param tempFiles Array to store the paths of temporary files created.
   * @returns The path of the audio file.
   */
  private getAudioPath(file: Express.Multer.File, tempFiles: string[]): string {
    if (file.path) {
      // diskStorage
      return file.path;
    } else if (file.buffer) {
      // memoryStorage: save buffer to temporary file
      const tempPath = this.tempFileHandler.createTempFile(file.buffer, file.originalname);
      tempFiles.push(tempPath);
      return tempPath;
    } else {
      throw new AppError('No file data available', 400);
    }
  }

  /**
   * Verify the validity of the audio file.
   * @param filePath The path of the audio file.
   */
  private async verifyAudio(filePath: string): Promise<void> {
    await this.audioConverter.verifyAudio(filePath);
  }

  /**
   * Convert the audio file to WAV format.
   * @param filePath The path of the original audio file.
   * @param tempFiles Array to store the paths of temporary files created.
   * @returns The path of the converted WAV file.
   */
  private async convertAudio(filePath: string, tempFiles: string[]): Promise<string> {
    const wavFilePath = await this.audioConverter.convertToWav(filePath);
    tempFiles.push(wavFilePath);
    return wavFilePath;
  }

  /**
   * Transcribe the WAV file using the OpenAI service.
   * @param wavPath The path of the WAV file.
   * @returns The transcription of the audio.
   */
  private async transcribeAudio(wavPath: string): Promise<string> {
    return await this.openAIService.transcribeAudio(wavPath);
  }

  /**
   * Analyze the transcription to get the expense details.
   * @param transcription The transcription of the audio.
   * @param householdId The ID of the household.
   * @param userId The ID of the user.
   * @returns The expense details.
   */
  private async analyzeTranscription(
    transcription: string,
    householdId: string,
    userId: string
  ): Promise<Expense | null> {
    return await this.openAIService.analyzeTranscription(transcription, householdId, userId);
  }

  /**
   * Clean up the temporary files created during the processing.
   * @param file The uploaded file.
   * @param wavFilePath The path of the converted WAV file.
   * @param tempFiles Array of temporary file paths.
   */
  private cleanupFiles(
    file: Express.Multer.File,
    wavFilePath: string | undefined,
    tempFiles: string[]
  ): void {
    if (!file.path && tempFiles.length > 0) {
      this.tempFileHandler.deleteTempFiles(tempFiles);
    } else if (file.path && wavFilePath) {
      this.tempFileHandler.deleteTempFiles([wavFilePath]);
    }
  }
}
