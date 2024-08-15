// src/middleware/contextMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

declare global {
    namespace Express {
        interface Request {
            context: {
                householdId: string;
                userId: string;
            }
        }
    }
}

export const setRequestContext = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.householdId) {
        return next(new AppError('User or household not found', 401));
    }

    req.context = {
        householdId: req.user.householdId,
        userId: req.user.id
    };

    next();
};