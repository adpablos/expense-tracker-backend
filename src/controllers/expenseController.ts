import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from '@ffprobe-installer/ffprobe';
import logger from '../config/logger';
import {NextFunction, Request, Response} from 'express';
import {ExpenseService} from '../services/expenseService';
import {Expense} from '../models/Expense';
import pool from '../config/db';
import {encodeImage} from '../utils/encodeImage';
import {analyzeTranscription, processReceipt, transcribeAudio} from '../services/external/openaiService';
import path from 'path';
import {AppError} from '../utils/AppError';
import {promisify} from 'util';
import {NotificationService} from "../services/external/notificationService";

const expenseService = new ExpenseService(pool);

if (!ffmpegPath) {
    throw new Error('FFmpeg path is null. Ensure ffmpeg-static is installed correctly.');
}
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const ffprobe = promisify(ffmpeg.ffprobe);

const notificationService = new NotificationService();

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, category, subcategory, amount, description, householdId, page = 1, limit = 10 } = req.query;

        // Date validation
        if (startDate && isNaN(new Date(startDate as string).getTime())) {
            return res.status(400).json({
                message: 'Invalid startDate format. Please provide the date in ISO 8601 format, such as "2024-08-09T00:00:00Z".'
            });
        }

        if (endDate && isNaN(new Date(endDate as string).getTime())) {
            return res.status(400).json({
                message: 'Invalid endDate format. Please provide the date in ISO 8601 format, such as "2024-08-09T23:59:59Z".'
            });
        }

        // Pagination validation
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        if (isNaN(pageNumber) || pageNumber < 1) {
            logger.warn('Invalid page number: %s', page);
            return res.status(400).json({message: 'Invalid page number. Must be a positive integer.'});
        }
        if (isNaN(limitNumber) || limitNumber < 1) {
            logger.warn('Invalid limit number: %s', limit);
            return res.status(400).json({message: 'Invalid limit number. Must be a positive integer.'});
        }

        // Building the filters object
        const filters = {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            category: category as string,
            subcategory: subcategory as string,
            amount: amount ? parseFloat(amount as string) : undefined,
            description: description as string,
            householdId: householdId as string,
            page: parseInt(page as string, 10),
            limit: parseInt(limit as string, 10)
        };

        const {expenses, totalItems} = await expenseService.getExpenses(filters);

        const totalPages = Math.ceil(totalItems / limitNumber);

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
        const { description, amount, category, subcategory, expenseDatetime } = req.body;
        const householdId = req.user?.householdId;

        if (!householdId) {
            return res.status(400).json({ message: 'User does not belong to a household' });
        }

        const expenseDate = new Date(expenseDatetime);

        if (isNaN(expenseDate.getTime())) {
            return res.status(400).json({
                message: 'Invalid expense datetime format. Please provide the datetime in ISO 8601 format, such as "2024-08-09T14:30:00Z" or "2024-08-09T14:30:00-04:00".'
            });
        }

        const newExpense = new Expense(description, amount, category, subcategory, householdId, expenseDate);
        const createdExpense = await expenseService.createExpense(newExpense);

        // Notify household members about the new expense
        await notificationService.notifyHouseholdMembers(
            householdId,
            `New expense added: ${createdExpense.description} - $${createdExpense.amount}`,
            req.user!.id
        );

        res.status(201).json(createdExpense);
    } catch (error) {
        logger.error('Error adding expense: %s', error);
        next(error);
    }
};


export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const { expense_datetime } = req.body;

        // Validate the date
        if (expense_datetime && isNaN(new Date(expense_datetime).getTime())) {
            return res.status(400).json({
                message: 'Invalid expense datetime format. Please provide the datetime in ISO 8601 format, such as "2024-08-09T14:30:00Z" or "2024-08-09T14:30:00-04:00".'
            });
        }

        // Update the expense
        const updatedExpense = await expenseService.updateExpense(id, req.body);

        if (!updatedExpense) {
            logger.warn('Expense not found: %s', id);
            return res.status(404).json({ message: 'Expense not found' });
        }

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

    const householdId = req.user?.householdId;
    if (!householdId) {
        logger.warn('User does not belong to a household');
        return res.status(400).json({ message: 'User does not belong to a household' });
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
            expenseDetails = await processReceipt(base64Image, householdId);
        } else if (req.file.mimetype.startsWith('audio')) {
            // Convert to WAV format
            wavFilePath = `${newFilePath}.wav`;
            await new Promise<void>((resolve, reject) => {
                ffmpeg(newFilePath)
                    .toFormat('wav')
                    .on('error', reject)
                    .on('end', () => resolve())
                    .save(wavFilePath!);
            });

            const transcription = await transcribeAudio(wavFilePath);
            expenseDetails = await analyzeTranscription(transcription, householdId);
        } else {
            throw new AppError('Unsupported file type', 400);
        }

        if (expenseDetails) {
            res.status(200).json({message: 'Expense logged successfully.', expense: expenseDetails});
        } else {
            res.status(422).json({
                message: 'No expense logged.',
                details: 'The file was processed successfully, but no valid expense could be identified.'
            });
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
