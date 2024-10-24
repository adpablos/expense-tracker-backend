// tests/unit/services/fileProcessors/ImageProcessor.test.ts
import 'reflect-metadata';
import { jest } from '@jest/globals';
import { Request } from 'express';
import { Container } from 'inversify';

import { DI_TYPES } from '../../../../src/config/di';
import { Expense } from '../../../../src/models/Expense';
import { ImageProcessor } from '../../../../src/services/fileProcessors/ImageProcessor';
import { AppError } from '../../../../src/utils/AppError';
import { createUnitTestContainer } from '../../../config/testContainers';
import { createMockExpense } from '../../mocks/objectFactories';
import { mockOpenAIService } from '../../mocks/serviceMocks';

jest.mock('../../../../src/config/logger');
jest.mock('../../../../src/utils/encodeImage');

describe('ImageProcessor', () => {
  let container: Container;
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    // Cambio principal: usar el nuevo contenedor
    container = createUnitTestContainer({
      mockServices: true,
    });

    container
      .bind<ImageProcessor>(DI_TYPES.FileProcessor)
      .to(ImageProcessor)
      .whenTargetNamed('ImageProcessor');

    imageProcessor = container.getNamed<ImageProcessor>(DI_TYPES.FileProcessor, 'ImageProcessor');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should process image from diskStorage successfully', async () => {
    const file: Express.Multer.File = {
      mimetype: 'image/jpeg',
      path: '/path/to/image.jpg',
      originalname: 'image.jpg',
    } as Express.Multer.File;

    const mockExpense: Partial<Expense> = createMockExpense({
      id: 'expense-id',
      description: 'Test Image Expense',
      amount: 100,
      category: 'Food',
      subcategory: 'Groceries',
      householdId: 'household-id',
    });

    const mockEncodeImage = jest.requireMock('../../../../src/utils/encodeImage') as {
      encodeImage: jest.Mock;
    };
    const mockBase64Image = 'base64encodedimage';
    mockEncodeImage.encodeImage.mockReturnValue(mockBase64Image);

    mockOpenAIService.processReceipt!.mockResolvedValue(mockExpense as Expense);

    const mockRequest = {
      currentHouseholdId: 'household-id',
      user: { id: 'user-id' },
    } as unknown as Request;

    const result = await imageProcessor.process(file, mockRequest);

    expect(mockEncodeImage.encodeImage).toHaveBeenCalledWith('/path/to/image.jpg');
    expect(mockOpenAIService.processReceipt).toHaveBeenCalledWith(
      mockBase64Image,
      'household-id',
      'user-id'
    );
    expect(result).toBe(mockExpense as Expense);
  });

  it('should process image from memoryStorage successfully', async () => {
    const file: Express.Multer.File = {
      mimetype: 'image/png',
      buffer: Buffer.from('mock image content'),
      originalname: 'image.png',
    } as Express.Multer.File;

    const mockExpense: Partial<Expense> = createMockExpense({
      id: 'expense-id',
      description: 'Test Image Expense',
      amount: 200,
      category: 'Entertainment',
      subcategory: 'Movies',
      householdId: 'household-id',
    });

    mockOpenAIService.processReceipt!.mockResolvedValue(mockExpense as Expense);

    const mockRequest = {
      currentHouseholdId: 'household-id',
      user: { id: 'user-id' },
    } as unknown as Request;

    const result = await imageProcessor.process(file, mockRequest);

    expect(mockOpenAIService.processReceipt).toHaveBeenCalledWith(
      file.buffer.toString('base64'),
      'household-id',
      'user-id'
    );
    expect(result).toBe(mockExpense as Expense);
  });

  it('should throw AppError if no file data is available', async () => {
    const file: Express.Multer.File = {
      mimetype: 'image/jpeg',
      originalname: 'image.jpg',
    } as Express.Multer.File;

    const mockRequest = {
      currentHouseholdId: 'household-id',
      user: { id: 'user-id' },
    } as unknown as Request;

    await expect(imageProcessor.process(file, mockRequest)).rejects.toThrow(AppError);
    await expect(imageProcessor.process(file, mockRequest)).rejects.toThrow(
      'Error processing image file'
    );
    expect(mockOpenAIService.processReceipt).not.toHaveBeenCalled();
  });

  it('should throw AppError if image processing fails', async () => {
    const file: Express.Multer.File = {
      mimetype: 'image/jpeg',
      path: '/path/to/image.jpg',
      originalname: 'image.jpg',
    } as Express.Multer.File;

    const mockEncodeImage = jest.requireMock('../../../../src/utils/encodeImage') as {
      encodeImage: jest.Mock;
    };
    mockEncodeImage.encodeImage.mockImplementation(() => {
      throw new Error('Error encoding image');
    });

    const mockRequest = {
      currentHouseholdId: 'household-id',
      user: { id: 'user-id' },
    } as unknown as Request;

    await expect(imageProcessor.process(file, mockRequest)).rejects.toThrow(AppError);
    await expect(imageProcessor.process(file, mockRequest)).rejects.toThrow(
      'Error processing image file'
    );
    expect(mockOpenAIService.processReceipt).not.toHaveBeenCalled();
  });
});
