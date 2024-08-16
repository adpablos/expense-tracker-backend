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

const expenseService = new ExpenseService(pool);

if (!ffmpegPath) {
    throw new Error('FFmpeg path is null. Ensure ffmpeg-static is installed correctly.');
}
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const ffprobe = promisify(ffmpeg.ffprobe);

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, category, subcategory, amount, description, page = 1, limit = 10 } = req.query;
        const filters = {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            category: category as string,
            subcategory: subcategory as string,
            amount: amount ? parseFloat(amount as string) : undefined,
            description: description as string,
            householdId: req.currentHouseholdId,
            page: parseInt(page as string, 10),
            limit: parseInt(limit as string, 10)
        };
        const { expenses, totalItems } = await expenseService.getExpenses(filters);
        res.json({
            page: filters.page,
            totalPages: Math.ceil(totalItems / filters.limit),
            totalItems,
            expenses
        });
    } catch (error) {
        logger.error('Error fetching expenses', { error });
        next(new AppError('Error fetching expenses', 500));
    }
};

export const addExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { description, amount, category, subcategory, expenseDatetime } = req.body;
        const newExpense = new Expense(
            description,
            amount,
            category,
            subcategory,
            req.currentHouseholdId,
            new Date(expenseDatetime)
        );
        const createdExpense = await expenseService.createExpense(newExpense, req.user!.id);
        res.status(201).json(createdExpense);
    } catch (error) {
        logger.error('Error adding expense', { error });
        next(new AppError('Error adding expense', 500));
    }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { description, amount, category, subcategory, expenseDatetime } = req.body;
        const updatedExpense = await expenseService.updateExpense(id, {
            description,
            amount,
            category,
            subcategory,
            expenseDatetime: new Date(expenseDatetime),
            householdId: req.currentHouseholdId
        }, req.currentHouseholdId, req.user!.id);
        if (!updatedExpense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json(updatedExpense);
    } catch (error) {
        logger.error('Error updating expense', { error });
        next(new AppError('Error updating expense', 500));
    }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await expenseService.deleteExpense(id, req.currentHouseholdId, req.user!.id);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting expense', { error });
        next(new AppError('Error deleting expense', 500));
    }
};

export const uploadExpense = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file || !req.file.path) {
        logger.warn('No file uploaded');
        return res.status(400).send('No file uploaded.');
    }

    const householdId = req.currentHouseholdId;
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
            expenseDetails = await processReceipt(base64Image, householdId, req.user!.id);
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
            expenseDetails = await analyzeTranscription(transcription, householdId, req.user!.id);
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
