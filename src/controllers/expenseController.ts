import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../data/expenseService';
import { Expense } from '../models/Expense';
import pool from '../config/db';
import { encodeImage } from '../utils/encodeImage';
import { analyzeTranscription, processReceipt, transcribeAudio } from '../external/openaiService';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/AppError';
import { parseISO, isValid } from 'date-fns';
import logger from '../config/logger';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

const expenseService = new ExpenseService(pool);

const ffprobe = promisify(ffmpeg.ffprobe);

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;

        // Date validation
        let startDateParsed: Date | undefined;
        let endDateParsed: Date | undefined;

        if (startDate) {
            startDateParsed = parseISO(startDate as string);
            if (!isValid(startDateParsed)) {
                logger.warn('Invalid startDate format: %s', startDate);
                return res.status(400).json({ message: 'Invalid startDate format. Expected format: YYYY-MM-DD' });
            }
        }

        if (endDate) {
            endDateParsed = parseISO(endDate as string);
            if (!isValid(endDateParsed)) {
                logger.warn('Invalid endDate format: %s', endDate);
                return res.status(400).json({ message: 'Invalid endDate format. Expected format: YYYY-MM-DD' });
            }
        }

        // Pagination validation
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        if (isNaN(pageNumber) || pageNumber < 1) {
            logger.warn('Invalid page number: %s', page);
            return res.status(400).json({ message: 'Invalid page number. Must be a positive integer.' });
        }
        if (isNaN(limitNumber) || limitNumber < 1) {
            logger.warn('Invalid limit number: %s', limit);
            return res.status(400).json({ message: 'Invalid limit number. Must be a positive integer.' });
        }

        const { expenses, totalItems } = await expenseService.getExpenses({
            startDate: startDateParsed,
            endDate: endDateParsed,
            page: pageNumber,
            limit: limitNumber,
        });

        const totalPages = Math.ceil(totalItems / limitNumber);

        logger.info('Retrieved expenses', { startDate, endDate, page: pageNumber, limit: limitNumber, totalItems });

        res.json({
            page: pageNumber,
            totalPages,
            nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
            totalItems,
            expenses
        });
    } catch (error) {
        logger.error('Error fetching expenses: %s', error);
        next(error);
    }
};

export const addExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { description, amount, category, subcategory, date } = req.body;
        const newExpense = new Expense(description, amount, category, subcategory, new Date(date));
        const createdExpense = await expenseService.createExpense(newExpense);

        logger.info('Added new expense', { description, amount, category, subcategory, date });

        res.status(201).json(createdExpense);
    } catch (error) {
        logger.error('Error adding expense: %s', error);
        next(error);
    }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const updatedExpense = await expenseService.updateExpense(id, req.body);
        if (!updatedExpense) {
            logger.warn('Expense not found: %s', id);
            return res.status(404).json({ message: 'Expense not found' });
        }

        logger.info('Updated expense: %s', id);

        res.status(200).json(updatedExpense);
    } catch (error) {
        logger.error('Error updating expense: %s', error);
        next(error);
    }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        await expenseService.deleteExpense(id);

        logger.info('Deleted expense: %s', id);

        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting expense: %s', error);
        next(error);
    }
};

export const uploadExpense = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file || !req.file.path) {
        logger.warn('No file uploaded');
        return res.status(400).send('No file uploaded.');
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname);
    const newFilePath = `${filePath}${fileExtension}`;
    let wavFilePath: string | null = null;

    try {
        fs.renameSync(filePath, newFilePath);

        // Verify the file is a valid audio file
        try {
            await ffprobe(newFilePath);
        } catch (error) {
            logger.error('Invalid audio file:', error);
            return res.status(400).send('Invalid audio file.');
        }

        let expenseDetails;
        if (req.file.mimetype.startsWith('image')) {
            const base64Image = encodeImage(newFilePath);
            expenseDetails = await processReceipt(base64Image);
        } else if (req.file.mimetype.startsWith('audio')) {
            // Convertir a WAV antes de transcribir
            wavFilePath = `${newFilePath}.wav`;
            await new Promise<void>((resolve, reject) => {
                ffmpeg(newFilePath)
                    .toFormat('wav')
                    .on('error', reject)
                    .on('end', () => resolve())
                    .save(wavFilePath!);
            });

            const transcription = await transcribeAudio(wavFilePath);
            expenseDetails = await analyzeTranscription(transcription);
        } else {
            throw new AppError('Unsupported file type', 400);
        }

        if (expenseDetails) {
            logger.info('Logged expense from file upload');
            res.status(200).json({ message: 'Expense logged successfully.', expense: expenseDetails });
        } else {
            logger.info('No expense logged from file upload');
            res.status(422).json({ message: 'No expense logged.', details: 'The file was processed successfully, but no valid expense could be identified.' });
        }
    } catch (error) {
        logger.error('Error processing the file: %s', error);
        res.status(500).send('Error processing the file.');
    } finally {
        // Cleaning up temporary files
        try {
            if (fs.existsSync(newFilePath)) {
                fs.unlinkSync(newFilePath);
            }
            if (wavFilePath && fs.existsSync(wavFilePath)) {
                fs.unlinkSync(wavFilePath);
            }
        } catch (error) {
            logger.error('Error cleaning up temporary files:', error);
        }
    }
};
