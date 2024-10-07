import fs from 'fs';

import { injectable, inject } from 'inversify';
import OpenAI from 'openai';

import clientOpenAI from '../../config/openaiConfig';
import { Expense } from '../../models/Expense';
import { DI_TYPES } from '../../config/di';
import { AppError } from '../../utils/AppError';
import { CategoryHierarchyService } from '../categoryHierarchyService';
import { ExpenseService } from '../expenseService';

@injectable()
export class OpenAIService {
  constructor(
    @inject(DI_TYPES.ExpenseService) private expenseService: ExpenseService,
    @inject(DI_TYPES.CategoryHierarchyService)
    private categoryHierarchyService: CategoryHierarchyService
  ) {}

  private async extractExpenseFromFunctionCall(
    functionCall: OpenAI.ChatCompletionMessageToolCall.Function | undefined,
    householdId: string,
    userId: string
  ): Promise<Expense | null> {
    if (functionCall && functionCall.name === 'log_expense') {
      const { date, amount, category, subcategory, notes } = JSON.parse(functionCall.arguments);

      const newExpense = new Expense(
        notes || 'Expense from receipt',
        parseFloat(amount),
        category,
        subcategory,
        householdId,
        new Date(date)
      );

      await this.expenseService.createExpense(newExpense, userId);
      return newExpense;
    } else {
      return null;
    }
  }

  async processReceipt(
    base64Image: string,
    householdId: string,
    userId: string
  ): Promise<Expense | null> {
    try {
      const categoriesString =
        await this.categoryHierarchyService.getCategoriesAndSubcategories(householdId);
      const currentDate = new Date().toISOString();

      const response = await clientOpenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract the receipt details and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the image, otherwise, use the current date by default (${currentDate}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: "2024-07-21", amount: 100.00, category: "Casa", subcategory: "Mantenimiento", notes: "Monthly maintenance fee"})\n`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        tools: [
          {
            type: 'function',
            function: {
              name: 'log_expense',
              description: 'Logs an expense in the system',
              parameters: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    description: 'Date of the expense',
                  },
                  amount: {
                    type: 'number',
                    description: 'Amount of the expense',
                  },
                  category: {
                    type: 'string',
                    description: 'Category of the expense',
                  },
                  subcategory: {
                    type: 'string',
                    description: 'Subcategory of the expense',
                  },
                  notes: {
                    type: 'string',
                    description:
                      'Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense',
                  },
                },
                required: ['date', 'amount', 'category'],
              },
            },
          },
        ],
      });

      const functionCall = response.choices?.[0]?.message?.tool_calls?.[0]?.function;
      return await this.extractExpenseFromFunctionCall(functionCall, householdId, userId);
    } catch {
      throw new AppError('Error processing receipt', 500);
    }
  }

  async transcribeAudio(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      throw new AppError('Invalid or empty audio file', 400);
    }

    try {
      const transcription = await clientOpenAI.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(filePath),
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      return transcription.text;
    } catch {
      throw new AppError('Error transcribing audio', 500);
    }
  }

  async analyzeTranscription(
    transcription: string,
    householdId: string,
    userId: string
  ): Promise<Expense | null> {
    try {
      const categoriesString =
        await this.categoryHierarchyService.getCategoriesAndSubcategories(householdId);
      const currentDate = new Date().toISOString();

      const response = await clientOpenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract the transcription details: ${transcription} and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the transcription, otherwise, use the current date by default (${currentDate}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: "2024-07-21", amount: 100.00, category: "Casa", subcategory: "Mantenimiento", notes: "Monthly maintenance fee"})\n`,
              },
            ],
          },
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        tools: [
          {
            type: 'function',
            function: {
              name: 'log_expense',
              description: 'Logs an expense in the system',
              parameters: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    description: 'Date of the expense',
                  },
                  amount: {
                    type: 'number',
                    description: 'Amount of the expense',
                  },
                  category: {
                    type: 'string',
                    description: 'Category of the expense',
                  },
                  subcategory: {
                    type: 'string',
                    description: 'Subcategory of the expense',
                  },
                  notes: {
                    type: 'string',
                    description:
                      'Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense',
                  },
                },
                required: ['date', 'amount', 'category'],
              },
            },
          },
        ],
      });

      const functionCall = response.choices?.[0]?.message?.tool_calls?.[0]?.function;
      return await this.extractExpenseFromFunctionCall(functionCall, householdId, userId);
    } catch {
      throw new AppError('Error analyzing transcription', 500);
    }
  }
}
