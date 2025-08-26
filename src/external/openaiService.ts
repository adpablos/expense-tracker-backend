import clientOpenAI from '../config/openaiConfig';
import { Expense } from "../models/Expense";
import { ExpenseService } from '../data/expenseService';
import { CategoryHierarchyService } from "../data/categoryHierarchyService";
import pool from '../config/db';
import fs from "fs";
import {
    FunctionCall,
    ResponsesClient,
    ToolCallContent,
} from "../types/openaiResponses";

const expenseService = new ExpenseService(pool);
const categoryHierarchyService = new CategoryHierarchyService(pool);
const responsesClient: ResponsesClient = (clientOpenAI as unknown as {
    responses: ResponsesClient;
}).responses;

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
    let lastError: unknown = new Error('Retries exhausted');
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error;
            if ((error as { name?: string })?.name !== 'APIConnectionError' || attempt === retries - 1) {
                throw error;
            }

            await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
        }
    }

    throw lastError;
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
    })));

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

    const transcription = await enqueueOpenAI(() => withRetry(() => clientOpenAI.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file: fs.createReadStream(filePath),
        response_format: "verbose_json",
        timestamp_granularities: ["word"]
    })));

    return transcription.text;
};

export const analyzeTranscription = async (transcription: string): Promise<Expense | null> => {
    const categoriesString = await categoryHierarchyService.getCategoriesAndSubcategories();
    const currentDate = new Date().toISOString();

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

    const toolCall = response.output?.[0]?.content?.find(
        (c): c is ToolCallContent => c.type === "tool_calls"
    );
    const functionCall = toolCall?.tool_calls?.[0]?.function;
    return await extracted(functionCall);
};
