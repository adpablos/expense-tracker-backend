import {NextFunction, Request, Response} from 'express';
import {AppError} from '../utils/AppError';
import logger from '../config/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Error: %s', err.message, {
        method: req.method,
        url: req.url,
        stack: err.stack,
        params: req.params,
        query: req.query,
        body: req.body,
    });

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred'
    });
};