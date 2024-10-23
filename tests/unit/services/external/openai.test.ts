import 'reflect-metadata';

import fs from 'fs';

import { Expense } from '../../../../src/models/Expense';
import { CategoryHierarchyService } from '../../../../src/services/categoryHierarchyService';
import { ExpenseService } from '../../../../src/services/expenseService';
import openaiClient from '../../../../src/services/external/clients/openaiClient';
import { OpenAIService } from '../../../../src/services/external/openaiService';
import { AppError } from '../../../../src/utils/AppError';

jest.mock('../../../../src/services/expenseService');
jest.mock('../../../../src/services/categoryHierarchyService');
jest.mock('../../../../src/services/external/clients/openaiClient', () => ({
  __esModule: true,
  default: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    audio: {
      transcriptions: {
        create: jest.fn(),
      },
    },
  },
}));
jest.mock('fs');

describe('OpenAIService', () => {
  let openAIService: OpenAIService;
  let mockExpenseService: jest.Mocked<ExpenseService>;
  let mockCategoryHierarchyService: jest.Mocked<CategoryHierarchyService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExpenseService = {
      createExpense: jest.fn(),
    } as unknown as jest.Mocked<ExpenseService>;
    mockCategoryHierarchyService = {
      getCategoriesAndSubcategories: jest.fn(),
    } as unknown as jest.Mocked<CategoryHierarchyService>;
    openAIService = new OpenAIService(mockExpenseService, mockCategoryHierarchyService);
  });

  describe('processReceipt', () => {
    it('should process receipt and create expense', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: 'log_expense',
                    arguments: JSON.stringify({
                      date: '2023-01-01',
                      amount: 100,
                      category: 'Food',
                      subcategory: 'Groceries',
                      notes: 'Weekly groceries',
                    }),
                  },
                },
              ],
            },
          },
        ],
      };
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);
      mockCategoryHierarchyService.getCategoriesAndSubcategories.mockResolvedValue(
        'Food: Groceries, Restaurants'
      );

      const result = await openAIService.processReceipt('base64image', 'household1', 'user1');

      expect(result).toBeInstanceOf(Expense);
      expect(mockExpenseService.createExpense).toHaveBeenCalled();
      expect(result?.amount).toBe(100);
      expect(result?.category).toBe('Food');
      expect(result?.subcategory).toBe('Groceries');
    });

    it('should return null if no expense is extracted', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              tool_calls: [],
            },
          },
        ],
      };
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);
      mockCategoryHierarchyService.getCategoriesAndSubcategories.mockResolvedValue(
        'Food: Groceries, Restaurants'
      );

      const result = await openAIService.processReceipt('base64image', 'household1', 'user1');

      expect(result).toBeNull();
      expect(mockExpenseService.createExpense).not.toHaveBeenCalled();
    });

    it('should throw AppError if OpenAI API call fails', async () => {
      (openaiClient.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(
        openAIService.processReceipt('base64image', 'household1', 'user1')
      ).rejects.toThrow(AppError);
    });
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio file', async () => {
      const mockTranscription = { text: 'Transcribed text' };
      (openaiClient.audio.transcriptions.create as jest.Mock).mockResolvedValue(mockTranscription);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1000 });

      const result = await openAIService.transcribeAudio('path/to/audio.mp3');

      expect(result).toBe('Transcribed text');
    });

    it('should throw AppError if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(openAIService.transcribeAudio('nonexistent.mp3')).rejects.toThrow(AppError);
    });

    it('should throw AppError if file is empty', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 0 });

      await expect(openAIService.transcribeAudio('empty.mp3')).rejects.toThrow(AppError);
    });

    it('should throw AppError if OpenAI API call fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 1000 });
      (openaiClient.audio.transcriptions.create as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      await expect(openAIService.transcribeAudio('path/to/audio.mp3')).rejects.toThrow(AppError);
    });
  });

  describe('analyzeTranscription', () => {
    it('should analyze transcription and create expense', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: 'log_expense',
                    arguments: JSON.stringify({
                      date: '2023-01-01',
                      amount: 50,
                      category: 'Transportation',
                      subcategory: 'Fuel',
                      notes: 'Gas station fill-up',
                    }),
                  },
                },
              ],
            },
          },
        ],
      };
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);
      mockCategoryHierarchyService.getCategoriesAndSubcategories.mockResolvedValue(
        'Transportation: Fuel, Public Transit'
      );

      const result = await openAIService.analyzeTranscription(
        'Filled up gas for $50',
        'household1',
        'user1'
      );

      expect(result).toBeInstanceOf(Expense);
      expect(mockExpenseService.createExpense).toHaveBeenCalled();
      expect(result?.amount).toBe(50);
      expect(result?.category).toBe('Transportation');
      expect(result?.subcategory).toBe('Fuel');
    });

    it('should return null if no expense is extracted from transcription', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              tool_calls: [],
            },
          },
        ],
      };
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);
      mockCategoryHierarchyService.getCategoriesAndSubcategories.mockResolvedValue(
        'Transportation: Fuel, Public Transit'
      );

      const result = await openAIService.analyzeTranscription(
        'This is not an expense',
        'household1',
        'user1'
      );

      expect(result).toBeNull();
      expect(mockExpenseService.createExpense).not.toHaveBeenCalled();
    });

    it('should throw AppError if OpenAI API call fails', async () => {
      (openaiClient.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(
        openAIService.analyzeTranscription('Transcription', 'household1', 'user1')
      ).rejects.toThrow(AppError);
    });
  });
});
