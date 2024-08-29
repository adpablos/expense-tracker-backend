import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import logger from '../config/logger';
import {NextFunction, Request, Response} from 'express';
import {inject, injectable} from 'inversify';
import {ExpenseService} from '../services/expenseService';
import {Expense} from '../models/Expense';
import {AppError} from '../utils/AppError';
import {encodeImage} from '../utils/encodeImage';
import {analyzeTranscription, processReceipt, transcribeAudio} from '../services/external/openaiService';
import path from 'path';
import {promisify} from 'util';
import {TYPES} from '../types';

const ffprobe = promisify(ffmpeg.ffprobe);

@injectable()
export class ExpenseController {
    constructor(
        @inject(TYPES.ExpenseService) private expenseService: ExpenseService
    ) {
    }

    public getExpenses = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {startDate, endDate, category, subcategory, amount, description, page = 1, limit = 10} = req.query;
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
            const {expenses, totalItems} = await this.expenseService.getExpenses(filters);
            res.json({
                page: filters.page,
                totalPages: Math.ceil(totalItems / filters.limit),
                totalItems,
                expenses
            });
        } catch (error) {
            next(error);
        }
    };

    public addExpense = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {description, amount, category, subcategory, expenseDatetime} = req.body;
            const newExpense = new Expense(
                description,
                amount,
                category,
                subcategory,
                req.currentHouseholdId,
                new Date(expenseDatetime)
            );
            const createdExpense = await this.expenseService.createExpense(newExpense, req.user!.id);
            res.status(201).json(createdExpense);
        } catch (error) {
            next(error);
        }
    };

    public updateExpense = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const {description, amount, category, subcategory, expenseDatetime} = req.body;
            const updatedExpense = await this.expenseService.updateExpense(id, {
                description,
                amount,
                category,
                subcategory,
                expenseDatetime: new Date(expenseDatetime),
                householdId: req.currentHouseholdId
            }, req.currentHouseholdId, req.user!.id);
            if (!updatedExpense) {
                return res.status(404).json({message: 'Expense not found'});
            }
            res.json(updatedExpense);
        } catch (error) {
            next(error);
        }
    };

    public deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            await this.expenseService.deleteExpense(id, req.currentHouseholdId, req.user!.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    public uploadExpense = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.file || !req.file.path) {
            return next(new AppError('No file uploaded', 400));
        }

        const householdId = req.currentHouseholdId;
        if (!householdId) {
            return next(new AppError('User does not belong to a household', 400));
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
                        .on('error', (err) => {
                            console.log('Error during audio conversion to WAV:', err);
                            reject(err);
                        })
                        .on('end', () => resolve())
                        .save(wavFilePath!);
                });

                const transcription = await transcribeAudio(wavFilePath);
                expenseDetails = await analyzeTranscription(transcription, householdId, req.user!.id);
            } else {
                logger.error('Unsupported file type:', req.file.mimetype);
                throw new AppError('Unsupported file type', 400);
            }

            if (expenseDetails) {
                res.status(200).json({message: 'Expense logged successfully.', expense: expenseDetails});
            } else {
                logger.error('No expense could be logged from the file');
                res.status(422).json({
                    message: 'No expense logged.',
                    details: 'The file was processed successfully, but no valid expense could be identified.'
                });
            }
        } catch (error) {
            next(error);
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
}
