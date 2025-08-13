import clientOpenAI from '../config/openaiConfig';
import {Expense} from "../models/Expense";
import {ExpenseService} from '../data/expenseService';
import {CategoryHierarchyService} from "../data/categoryHierarchyService";
import pool from '../config/db';
import fs from "fs";
import OpenAI from "openai";

const expenseService = new ExpenseService(pool);
const categoryHierarchyService = new CategoryHierarchyService(pool);

async function extracted(functionCall: OpenAI.ChatCompletionMessageToolCall.Function | undefined) {
    if (functionCall && functionCall.name === "log_expense") {
        const {date, amount, category, subcategory, notes} = JSON.parse(functionCall.arguments);

        const newExpense = new Expense(
            notes || 'Expense from receipt',
            parseFloat(amount),
            category,
            subcategory,
            new Date(date)
        );

        await expenseService.createExpense(newExpense);
        return newExpense;
    } else {
        return null;
    }
}

export const processReceipt = async (base64Image: string) => {
    const categoriesString = await categoryHierarchyService.getCategoriesAndSubcategories();
    const currentDate = new Date().toISOString();

    try {
        const response = await clientOpenAI.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Extract the receipt details and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the image, otherwise, use the current date by default (${currentDate}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: \"2024-07-21\", amount: 100.00, category: \"Casa\", subcategory: \"Mantenimiento\", notes: \"Monthly maintenance fee\"})\n`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            }
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        tools: [
            {
                "type": "function",
                "function": {
                    "name": "log_expense",
                    "description": "Logs an expense in the system",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {
                                "type": "string",
                                "description": "Date of the expense"
                            },
                            "amount": {
                                "type": "number",
                                "description": "Amount of the expense"
                            },
                            "category": {
                                "type": "string",
                                "description": "Category of the expense"
                            },
                            "subcategory": {
                                "type": "string",
                                "description": "Subcategory of the expense"
                            },
                            "notes": {
                                "type": "string",
                                "description": "Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense"
                            }
                        },
                        "required": [
                            "date",
                            "amount",
                            "category"
                        ]
                    }
                }
            }
        ],
        });

        const functionCall = response.choices?.[0]?.message?.tool_calls?.[0]?.function;
        return await extracted(functionCall);
    } catch (error) {
        if (error instanceof OpenAI.APIConnectionError) {
            console.error('OpenAI connection failed while processing receipt', error);
        }
        throw error;
    }
};

export const transcribeAudio = async (filePath: string): Promise<string> => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
        throw new Error('Invalid or empty audio file');
    }

    try {
        const transcription = await clientOpenAI.audio.transcriptions.create({
            model: "whisper-1",
            file: fs.createReadStream(filePath),
            response_format: "verbose_json",
            timestamp_granularities: ["word"]
        });

        return transcription.text;
    } catch (error) {
        if (error instanceof OpenAI.APIConnectionError) {
            console.error('OpenAI connection failed while transcribing audio', error);
        }
        throw error;
    }
};

export const analyzeTranscription = async (transcription: string): Promise<Expense | null> => {
    const categoriesString = await categoryHierarchyService.getCategoriesAndSubcategories();
    const currentDate = new Date().toISOString();

    try {
        const response = await clientOpenAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Extract the transcription details: ${transcription} and determine if we should log this expense. If yes, call the log_expense function.\n\nTo determine the category and subcategory, take into account that now we have the followings Categories and Subcategories: \n\n${categoriesString}\n\nTo determine the date, use what is explicitly mentioned in the transcription, otherwise, use the current date by default (${currentDate}).\n\nThe log_expense function should be called with the following parameters: \n- date: string (Date of the expense) \n- amount: number (Amount of the expense) \n- category: string (Category of the expense) \n- subcategory: string (Subcategory of the expense) \n- notes: string (Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense)\n\nExample call to log_expense: log_expense({date: \"2024-07-21\", amount: 100.00, category: \"Casa\", subcategory: \"Mantenimiento\", notes: \"Monthly maintenance fee\"})\n`
                    }
                ]
            }
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        tools: [
            {
                "type": "function",
                "function": {
                    "name": "log_expense",
                    "description": "Logs an expense in the system",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {
                                "type": "string",
                                "description": "Date of the expense"
                            },
                            "amount": {
                                "type": "number",
                                "description": "Amount of the expense"
                            },
                            "category": {
                                "type": "string",
                                "description": "Category of the expense"
                            },
                            "subcategory": {
                                "type": "string",
                                "description": "Subcategory of the expense"
                            },
                            "notes": {
                                "type": "string",
                                "description": "Additional notes for the expense, such as the name of the store, items purchased, or any specific context about the expense"
                            }
                        },
                        "required": [
                            "date",
                            "amount",
                            "category"
                        ]
                    }
                }
            }
            ],
        });

        const functionCall = response.choices?.[0]?.message?.tool_calls?.[0]?.function;
        return await extracted(functionCall);
    } catch (error) {
        if (error instanceof OpenAI.APIConnectionError) {
            console.error('OpenAI connection failed while analyzing transcription', error);
        }
        throw error;
    }
};
