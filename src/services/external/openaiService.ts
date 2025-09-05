import fs from 'fs';

import { injectable, inject } from 'inversify';
import OpenAI from 'openai';

import config from '../../config/config';
import { DI_TYPES } from '../../config/di';
import logger from '../../config/logger';
import { Expense } from '../../models/Expense';
import { AppError } from '../../utils/AppError';
import { CategoryHierarchyService } from '../categoryHierarchyService';
import { ExpenseService } from '../expenseService';

import openaiClient from './clients/openaiClient';

@injectable()
export class OpenAIService {
  constructor(
    @inject(DI_TYPES.ExpenseService) private expenseService: ExpenseService,
    @inject(DI_TYPES.CategoryHierarchyService)
    private categoryHierarchyService: CategoryHierarchyService
  ) {}

  private getLogExpenseTool() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'log_expense',
          description: 'Logs an expense in the system',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Date of the expense' },
              amount: { type: 'number', description: 'Amount of the expense' },
              category: { type: 'string', description: 'Category of the expense' },
              subcategory: { type: 'string', description: 'Subcategory of the expense' },
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
    ];
  }

  private buildReceiptMessages(
    base64Image: string,
    categoriesString: string,
    currentDateIso: string
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract the receipt details and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the image, otherwise, use the current date by default (${currentDateIso}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: "2024-07-21", amount: 100.00, category: "Casa", subcategory: "Mantenimiento", notes: "Monthly maintenance fee"})\n`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ];
  }

  private buildTranscriptionMessages(
    transcription: string,
    categoriesString: string,
    currentDateIso: string
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract the transcription details: ${transcription} and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the transcription, otherwise, use the current date by default (${currentDateIso}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: "2024-07-21", amount: 100.00, category: "Casa", subcategory: "Mantenimiento", notes: "Monthly maintenance fee"})\n`,
          },
        ],
      },
    ];
  }

  private async callModelForFunctionCall(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<OpenAI.ChatCompletionMessageToolCall.Function | undefined> {
    type ResponsesOutput = {
      output?: Array<{ content?: Array<{ type: string; name?: string; input?: unknown }> }>;
    };

    const input = messages.map((m) => {
      type MsgContent =
        | { type: 'text'; text?: string }
        | { type: 'image_url'; image_url?: { url?: string } };
      const raw = (m as { content?: unknown }).content;
      const items: MsgContent[] = Array.isArray(raw) ? (raw as MsgContent[]) : [];
      const converted = items
        .map((it) => {
          if (it.type === 'text' && typeof it.text === 'string') {
            return { type: 'input_text', text: it.text } as const;
          }
          if (it.type === 'image_url' && typeof it.image_url?.url === 'string') {
            return { type: 'input_image', image_url: it.image_url.url } as const;
          }
          return undefined;
        })
        .filter(
          (
            v
          ): v is
            | { type: 'input_text'; text: string }
            | { type: 'input_image'; image_url: string } => Boolean(v)
        );
      return { role: m.role, content: converted } as const;
    });

    const resp = (await (
      openaiClient as unknown as {
        responses: { create: (p: unknown) => Promise<ResponsesOutput> };
      }
    ).responses.create({
      model: config.openai.model,
      input,
      temperature: 0.3,
      max_output_tokens: 800,
      tool_choice: 'auto',
      tools: this.getLogExpenseTool(),
    })) as ResponsesOutput;

    const toolUse = resp.output
      ?.flatMap((o) => o.content || [])
      ?.find((c: unknown) => (c as { type?: string })?.type === 'tool_use') as
      | { type: 'tool_use'; name?: string; input?: unknown }
      | undefined;

    if (toolUse?.name === 'log_expense') {
      return {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input ?? {}),
      } as unknown as OpenAI.ChatCompletionMessageToolCall.Function;
    }

    return undefined;
  }

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
      const currentDateIso = new Date().toISOString();

      const messages = this.buildReceiptMessages(base64Image, categoriesString, currentDateIso);
      const functionCall = await this.callModelForFunctionCall(messages);
      return await this.extractExpenseFromFunctionCall(functionCall, householdId, userId);
    } catch (error) {
      logger.error('Error processing receipt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        householdId,
      });
      throw new AppError('Error processing receipt', 500);
    }
  }

  async transcribeAudio(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      throw new AppError('Invalid or empty audio file', 400);
    }

    try {
      const transcription = await openaiClient.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(filePath),
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      return transcription.text;
    } catch (error) {
      logger.error('Error transcribing audio', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
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
      const currentDateIso = new Date().toISOString();

      const messages = this.buildTranscriptionMessages(
        transcription,
        categoriesString,
        currentDateIso
      );
      const functionCall = await this.callModelForFunctionCall(messages);
      return await this.extractExpenseFromFunctionCall(functionCall, householdId, userId);
    } catch (error) {
      logger.error('Error analyzing transcription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        householdId,
      });
      throw new AppError('Error analyzing transcription', 500);
    }
  }
}
