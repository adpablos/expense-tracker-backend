import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { HouseholdService } from '../services/householdService';
import logger from '../config/logger';

declare global {
    namespace Express {
        interface Request {
            currentHouseholdId: string; // Cambiado de opcional a requerido
        }
    }
}

export const setCurrentHousehold = (householdService: HouseholdService) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const householdId = req.header('X-Household-Id');

        if (!req.user) {
            logger.warn('User not authenticated');
            return next(new AppError('User not authenticated', 401));
        }

        try {
            if (householdId) {
                const hasAccess = await householdService.userHasAccessToHousehold(req.user.id, householdId);
                if (!hasAccess) {
                    logger.warn(`User ${req.user.id} attempted to access unauthorized household ${householdId}`);
                    return next(new AppError('User does not have access to this household', 403));
                }
                req.currentHouseholdId = householdId;
            } else {
                const defaultHousehold = await householdService.getDefaultHouseholdForUser(req.user.id);
                if (!defaultHousehold) {
                    logger.warn(`No default household found for user ${req.user.id}`);
                    return next(new AppError('No household selected and no default household found', 400));
                }
                req.currentHouseholdId = defaultHousehold.id;
            }

            logger.info(`Set current household to ${req.currentHouseholdId} for user ${req.user.id}`);
            next();
        } catch (error) {
            logger.error('Error in setCurrentHousehold middleware', { error });
            next(new AppError('Error setting current household', 500));
        }
    };
};

export const ensureHouseholdSelected = (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentHouseholdId) {
        return next(new AppError('No household selected', 400));
    }
    next();
};