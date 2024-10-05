// tests/unit/services/fileProcessors/AudioProcessor.test.ts
import 'reflect-metadata';
import { jest } from '@jest/globals';
import { Request } from 'express';
import { Container } from 'inversify';

import { Expense } from '../../../../src/models/Expense';
import { User } from '../../../../src/models/User';
import { AudioConverter } from '../../../../src/services/fileProcessors/AudioConverter';
import { AudioProcessor } from '../../../../src/services/fileProcessors/AudioProcessor';
import { DI_TYPES } from '../../../../src/types/di';
import { AppError } from '../../../../src/utils/AppError';
import { createTestContainer } from '../../../testContainer';
import { createMockExpense } from '../../mocks/objectFactories';
import { mockOpenAIService, mockTempFileHandler } from '../../mocks/serviceMocks';

jest.mock('../../../../src/config/logger');

const mockUser = new User('test@example.com', 'Test User', 'auth-provider-id', 'user-id', []);
mockUser.addHousehold = jest.fn();
mockUser.removeHousehold = jest.fn();

describe('AudioProcessor', () => {
  let container: Container;
  let audioProcessor: AudioProcessor;
  let mockAudioConverter: jest.Mocked<AudioConverter>;

  beforeEach(() => {
    container = createTestContainer({
      mockServices: true,
    });

    mockAudioConverter = {
      verifyAudio: jest.fn(),
      convertToWav: jest.fn(),
    };
    container.bind<AudioConverter>(DI_TYPES.AudioConverter).toConstantValue(mockAudioConverter);

    container
      .bind<AudioProcessor>(DI_TYPES.FileProcessor)
      .to(AudioProcessor)
      .whenTargetNamed('AudioProcessor');

    audioProcessor = container.getNamed<AudioProcessor>(DI_TYPES.FileProcessor, 'AudioProcessor');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should process audio from diskStorage successfully', async () => {
    const file: Express.Multer.File = {
      mimetype: 'audio/mpeg',
      path: '/path/to/audio.mp3',
      originalname: 'audio.mp3',
    } as Express.Multer.File;

    const req: Partial<Request> = {
      currentHouseholdId: 'household-id',
      user: mockUser,
    };

    const transcription = 'Transcribed text';
    const mockExpense: Partial<Expense> = createMockExpense({
      id: 'expense-id',
      description: 'Test Audio Expense',
      amount: 150,
      category: 'Transport',
      subcategory: 'Fuel',
      householdId: 'household-id',
    });

    const mockWavPath = '/path/to/audio.mp3.wav';

    mockAudioConverter.verifyAudio.mockResolvedValue();
    mockAudioConverter.convertToWav.mockResolvedValue(mockWavPath);

    mockOpenAIService.transcribeAudio!.mockResolvedValue(transcription);
    mockOpenAIService.analyzeTranscription!.mockResolvedValue(mockExpense as Expense);

    const result = await audioProcessor.process(file, req as Request);

    expect(mockAudioConverter.verifyAudio).toHaveBeenCalledWith('/path/to/audio.mp3');
    expect(mockAudioConverter.convertToWav).toHaveBeenCalledWith('/path/to/audio.mp3');
    expect(mockOpenAIService.transcribeAudio).toHaveBeenCalledWith(mockWavPath);
    expect(mockOpenAIService.analyzeTranscription).toHaveBeenCalledWith(
      transcription,
      'household-id',
      'user-id'
    );
    expect(mockTempFileHandler.deleteTempFiles).toHaveBeenCalledTimes(1);
    expect(mockTempFileHandler.deleteTempFiles).toHaveBeenCalledWith([mockWavPath]);
    expect(result).toBe(mockExpense as Expense);
  });

  it('should process audio from memoryStorage successfully', async () => {
    const file: Express.Multer.File = {
      mimetype: 'audio/mpeg',
      buffer: Buffer.from('mock audio content'),
      originalname: 'audio.mp3',
    } as Express.Multer.File;

    const req: Partial<Request> = {
      currentHouseholdId: 'household-id',
      user: mockUser,
    };

    const transcription = 'Transcribed text';
    const mockExpense: Partial<Expense> = createMockExpense({
      id: 'expense-id',
      description: 'Test Audio Expense',
      amount: 150,
      category: 'Transport',
      subcategory: 'Fuel',
      householdId: 'household-id',
    });

    const mockTempPath = '/tmp/mock-audio.mp3';
    const mockWavPath = '/tmp/mock-audio.mp3.wav';

    mockTempFileHandler.createTempFile!.mockReturnValue(mockTempPath);
    mockTempFileHandler.deleteTempFiles!.mockReturnValue(undefined);

    mockAudioConverter.verifyAudio.mockResolvedValue();
    mockAudioConverter.convertToWav.mockResolvedValue(mockWavPath);

    mockOpenAIService.transcribeAudio!.mockResolvedValue(transcription);
    mockOpenAIService.analyzeTranscription!.mockResolvedValue(mockExpense as Expense);

    const result = await audioProcessor.process(file, req as Request);

    expect(mockTempFileHandler.createTempFile).toHaveBeenCalledWith(
      Buffer.from('mock audio content'),
      'audio.mp3'
    );
    expect(mockAudioConverter.verifyAudio).toHaveBeenCalledWith(mockTempPath);
    expect(mockAudioConverter.convertToWav).toHaveBeenCalledWith(mockTempPath);
    expect(mockOpenAIService.transcribeAudio).toHaveBeenCalledWith(mockWavPath);
    expect(mockOpenAIService.analyzeTranscription).toHaveBeenCalledWith(
      transcription,
      'household-id',
      'user-id'
    );
    expect(mockTempFileHandler.deleteTempFiles).toHaveBeenCalledTimes(1);
    expect(mockTempFileHandler.deleteTempFiles).toHaveBeenCalledWith([mockTempPath, mockWavPath]);
    expect(result).toBe(mockExpense as Expense);
  });

  it('should throw AppError if no file data is available', async () => {
    const file: Express.Multer.File = {
      mimetype: 'audio/mpeg',
      originalname: 'audio.mp3',
    } as Express.Multer.File;

    const req: Partial<Request> = {
      currentHouseholdId: 'household-id',
      user: mockUser,
    };

    await expect(audioProcessor.process(file, req as Request)).rejects.toThrow(AppError);
    await expect(audioProcessor.process(file, req as Request)).rejects.toThrow(
      'No file data available'
    );
    expect(mockTempFileHandler.createTempFile).not.toHaveBeenCalled();
    expect(mockAudioConverter.verifyAudio).not.toHaveBeenCalled();
  });

  it('should throw AppError if audio verification fails', async () => {
    const file: Express.Multer.File = {
      mimetype: 'audio/mpeg',
      path: '/path/to/invalid/audio.mp3',
      originalname: 'audio.mp3',
    } as Express.Multer.File;

    const req: Partial<Request> = {
      currentHouseholdId: 'household-id',
      user: mockUser,
    };

    mockAudioConverter.verifyAudio.mockRejectedValue(new AppError('Invalid audio file.', 400));

    await expect(audioProcessor.process(file, req as Request)).rejects.toThrow(AppError);
    await expect(audioProcessor.process(file, req as Request)).rejects.toThrow(
      'Invalid audio file.'
    );
    expect(mockTempFileHandler.deleteTempFiles).not.toHaveBeenCalled();
  });

  it('should throw AppError if audio conversion fails', async () => {
    const file: Express.Multer.File = {
      mimetype: 'audio/mpeg',
      path: '/path/to/audio.mp3',
      originalname: 'audio.mp3',
    } as Express.Multer.File;

    const req: Partial<Request> = {
      currentHouseholdId: 'household-id',
      user: mockUser,
    };

    mockAudioConverter.verifyAudio.mockResolvedValue();
    mockAudioConverter.convertToWav.mockRejectedValue(
      new AppError('Error converting audio file.', 500)
    );

    await expect(audioProcessor.process(file, req as Request)).rejects.toThrow(AppError);
    await expect(audioProcessor.process(file, req as Request)).rejects.toThrow(
      'Error converting audio file.'
    );
    expect(mockTempFileHandler.deleteTempFiles).not.toHaveBeenCalled();
  });

  it('should correctly identify processable files', () => {
    const audioFile: Express.Multer.File = { mimetype: 'audio/mpeg' } as Express.Multer.File;
    const imageFile: Express.Multer.File = { mimetype: 'image/jpeg' } as Express.Multer.File;

    expect(audioProcessor.canProcess(audioFile)).toBe(true);
    expect(audioProcessor.canProcess(imageFile)).toBe(false);
  });
});
