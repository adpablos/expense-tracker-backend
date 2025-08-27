import clientOpenAI from '../config/openaiConfig';
import { Expense } from "../models/Expense";
import { ExpenseService } from '../data/expenseService';
import { CategoryHierarchyService } from "../data/categoryHierarchyService";
import pool from '../config/db';
import fs from "fs";
import logger from '../config/logger';
import {
    FunctionCall,
    ResponsesClient,
    ResponsesCreateParams,
    ResponsesCreateResponse,
    ToolCallContent,
} from "../types/openaiResponses";
import { APIConnectionError, APIConnectionTimeoutError } from "openai";
import { AppError } from "../utils/AppError";

const expenseService = new ExpenseService(pool);
const categoryHierarchyService = new CategoryHierarchyService(pool);

const responsesClient: ResponsesClient = {
    async create(params: ResponsesCreateParams): Promise<ResponsesCreateResponse> {
        const response = await fetch(`${clientOpenAI.baseURL}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${clientOpenAI.apiKey}`,
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }

        return (await response.json()) as ResponsesCreateResponse;
    },
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            if (attempt > 0) {
                logger.debug('Retrying OpenAI request (attempt %d)', attempt + 1);
            }
            return await fn();
        } catch (error: unknown) {
            const isRetryable =
                error instanceof APIConnectionError ||
                error instanceof APIConnectionTimeoutError;

            logger.warn(
                'OpenAI request failed on attempt %d: %s',
                attempt + 1,
                (error as Error).message
            );

            if (!isRetryable) {
                throw error;
            }

            if (attempt === retries - 1) {
                logger.error('Failed to connect to OpenAI after %d attempts', retries);
                throw new AppError('Failed to connect to OpenAI', 503);
            }

            const backoff = delayMs * (attempt + 1);
            logger.debug('Waiting %dms before next retry', backoff);
            await new Promise((res) => setTimeout(res, backoff));
        }
    }

    // Should never reach here
    throw new AppError('Failed to connect to OpenAI', 503);
}

let openAiQueue: Promise<unknown> = Promise.resolve();
async function enqueueOpenAI<T>(fn: () => Promise<T>): Promise<T> {
    const next = openAiQueue.then(() => fn());
    openAiQueue = next.catch(() => {});
    return next;
}
async function extracted(functionCall: FunctionCall | undefined) {
    if (functionCall && functionCall.name === 'log_expense') {
        if (!functionCall.arguments) {
            throw new Error('Missing arguments in functionCall for log_expense');
        }
        const { date, amount, category, subcategory, notes } = JSON.parse(functionCall.arguments);

        const newExpense = new Expense(
            notes || 'Expense from receipt',
            parseFloat(amount),
            category,
            subcategory,
            new Date(date)
        );

        await expenseService.createExpense(newExpense);
        return newExpense;
    }
    return null;
}

export const processReceipt = async (base64Image: string) => {
    const categoriesString = await categoryHierarchyService.getCategoriesAndSubcategories();
    const currentDate = new Date().toISOString();

    const params: ResponsesCreateParams = {
        model: "gpt-4o-mini",
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: `Extract the receipt details and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the image, otherwise, use the current date by default (${currentDate}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: \"2024-07-21\", amount: 100.00, category: \"Casa\", subcategory: \"Mantenimiento\", notes: \"Monthly maintenance fee\"})\n`
                    },
                    {
                        type: "input_image",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            }
        ],
        temperature: 1,
        max_output_tokens: 256,
        top_p: 1,
        tools: [
            {
                type: "function",
                function: {
                    name: "log_expense",
                    description: "Logs an expense in the system",
                    parameters: {
                        type: "object",
                        properties: {
                            date: {
                                type: "string",
                                description: "Date of the expense"
                            },
                            amount: {
                                type: "number",
                                description: "Amount of the expense"
                            },
                            category: {
                                type: "string",
                                description: "Category of the expense"
                            },
                            subcategory: {
                                type: "string",
                                description: "Subcategory of the expense"
                            },
                            notes: {
                                type: "string",
                                description: "Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense"
                            }
                        },
                        required: ["date", "amount", "category"]
                    }
                }
            }
        ]
    };

    logger.debug('Calling OpenAI to process receipt', {
        model: params.model,
        inputTypes: params.input[0].content.map((c) => c.type),
    });

    const response = await enqueueOpenAI(() =>
        withRetry(() => responsesClient.create(params))
    );

    logger.debug('OpenAI response for processReceipt received', { hasOutput: !!response.output });

    const toolCall = response.output?.[0]?.content?.find(
        (c): c is ToolCallContent => c.type === "tool_calls"
    );
    const functionCall = toolCall?.tool_calls?.[0]?.function;
    return await extracted(functionCall);
};

export const transcribeAudio = async (filePath: string): Promise<string> => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
        throw new Error('Invalid or empty audio file');
    }

    logger.debug('Calling OpenAI to transcribe audio', { model: 'gpt-4o-mini-transcribe', filePath });

    const transcription = await enqueueOpenAI(() =>
        withRetry(() =>
            clientOpenAI.audio.transcriptions.create({
                model: "gpt-4o-mini-transcribe",
                file: fs.createReadStream(filePath),
                response_format: "verbose_json",
                timestamp_granularities: ["word"]
            })
        )
    );

    logger.debug('Received transcription from OpenAI', {
        textPreview: transcription.text.slice(0, 50)
    });

    return transcription.text;
};

export const analyzeTranscription = async (transcription: string): Promise<Expense | null> => {
    const categoriesString = await categoryHierarchyService.getCategoriesAndSubcategories();
    const currentDate = new Date().toISOString();
    logger.debug('Calling OpenAI to analyze transcription', {
        model: 'gpt-4o-mini',
        transcriptionPreview: transcription.slice(0, 50),
    });


    const response = await enqueueOpenAI(() =>
        withRetry(() =>
            responsesClient.create({
                model: "gpt-4o-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: `Extract the transcription details: ${transcription} and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the transcription, otherwise, use the current date by default (${currentDate}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: \"2024-07-21\", amount: 100.00, category: \"Casa\", subcategory: \"Mantenimiento\", notes: \"Monthly maintenance fee\"})\n`
                            }
                        ]
                    }
                ],
                temperature: 1,
                max_output_tokens: 256,
                top_p: 1,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "log_expense",
                            description: "Logs an expense in the system",
                            parameters: {
                                type: "object",
                                properties: {
                                    date: {
                                        type: "string",
                                        description: "Date of the expense"
                                    },
                                    amount: {
                                        type: "number",
                                        description: "Amount of the expense"
                                    },
                                    category: {
                                        type: "string",
                                        description: "Category of the expense"
                                    },
                                    subcategory: {
                                        type: "string",
                                        description: "Subcategory of the expense"
                                    },
                                    notes: {
                                        type: "string",
                                        description: "Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense"
                                    }
                                },
                                required: ["date", "amount", "category"]
                            }
                        }
                    }
                ]
            })
        )
    );

    logger.debug('OpenAI response for analyzeTranscription received', { hasOutput: !!response.output });

    const toolCall = response.output?.[0]?.content?.find(
        (c): c is ToolCallContent => c.type === "tool_calls"
    );
    const functionCall = toolCall?.tool_calls?.[0]?.function;
    return await extracted(functionCall);
};
