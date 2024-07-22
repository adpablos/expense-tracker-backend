import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../data/expenseService';
import { Expense } from '../models/Expense';
import { pool } from '../db';
import { encodeImage } from '../utils/encodeImage';
import {analyzeTranscription, processReceipt, transcribeAudio} from '../external/openaiService';
import fs from "fs";
import path from 'path';
import {AppError} from "../utils/AppError";
import { parseISO, isValid } from 'date-fns';

const expenseService = new ExpenseService(pool);

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;

        // Date validation
        let startDateParsed: Date | undefined;
        let endDateParsed: Date | undefined;

        if (startDate) {
            startDateParsed = parseISO(startDate as string);
            if (!isValid(startDateParsed)) {
                return res.status(400).json({ message: 'Invalid startDate format. Expected format: YYYY-MM-DD' });
            }
        }

        if (endDate) {
            endDateParsed = parseISO(endDate as string);
            if (!isValid(endDateParsed)) {
                return res.status(400).json({ message: 'Invalid endDate format. Expected format: YYYY-MM-DD' });
            }
        }

        // Pagination validation
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json({ message: 'Invalid page number. Must be a positive integer.' });
        }
        if (isNaN(limitNumber) || limitNumber < 1) {
            return res.status(400).json({ message: 'Invalid limit number. Must be a positive integer.' });
        }

        const { expenses, totalItems } = await expenseService.getExpenses({
            startDate: startDateParsed,
            endDate: endDateParsed,
            page: pageNumber,
            limit: limitNumber,
        });

        const totalPages = Math.ceil(totalItems / limitNumber);

        res.json({
            page: pageNumber,
            totalPages,
            nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
            totalItems,
            expenses
        });
    } catch (error) {
        next(error);
    }
};

export const addExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { description, amount, category, subcategory, date } = req.body;
        const newExpense = new Expense(description, amount, category, subcategory, new Date(date));
        const createdExpense = await expenseService.createExpense(newExpense);
        res.status(201).json(createdExpense);
    } catch (error) {
        next(error);
    }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const updatedExpense = await expenseService.updateExpense(id, req.body);
        if (!updatedExpense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.status(200).json(updatedExpense);
    } catch (error) {
        next(error);
    }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        await expenseService.deleteExpense(id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file || !req.file.path) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = req.file.path;

    try {
        const base64Image = encodeImage(filePath);
        const expenseDetails = await processReceipt(base64Image);

        if (expenseDetails) {
            res.status(200).json({ message: 'Expense logged successfully.', expense: expenseDetails });
        } else {
            res.status(200).send('No expense logged.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing the image.');
    } finally {
        fs.unlinkSync(filePath); // Delete the temporary file after processing
    }
};

export const uploadAudio = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file || !req.file.path) {
        return res.status(400).send('No file uploaded.');
    }

    // Retrieve the uploaded file from the request body
    const uploadedFile = req.file;
    // Determine the file type
    const fileExtension = uploadedFile.mimetype ?uploadedFile.mimetype : null;

    const audioPath = req.file.path;

    try {
        const transcription = await transcribeAudio(audioPath);

        const expenseDetails = await analyzeTranscription(transcription);

        if (expenseDetails) {
            res.status(200).json({ message: 'Expense logged successfully.', expense: expenseDetails });
        } else {
            res.status(200).send('No expense logged.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing the audio.');
    } finally {
        fs.unlinkSync(audioPath); // Elimina el archivo temporal después de procesarlo
    }
};

export const uploadExpense = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file || !req.file.path) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;
    const fileExtension = path.extname(req.file.originalname);
    const newFilePath = `${filePath}${fileExtension}`;

    try {
        fs.renameSync(filePath, newFilePath);

        let expenseDetails;
        if (fileMimeType.startsWith('image')) {
            const base64Image = encodeImage(newFilePath);
            expenseDetails = await processReceipt(base64Image);
        } else if (fileMimeType.startsWith('audio')) {
            const transcription = await transcribeAudio(newFilePath);
            expenseDetails = await analyzeTranscription(transcription);
        } else {
            throw new AppError('Unsupported file type', 400);
        }

        if (expenseDetails) {
            res.status(200).json({ message: 'Expense logged successfully.', expense: expenseDetails });
        } else {
            res.status(200).send('No expense logged.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing the file.');
    } finally {
        fs.unlinkSync(newFilePath);
    }
};
