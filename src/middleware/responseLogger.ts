// src/middleware/responseLogger.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

const responseLogger = (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (body?: any): Response {
        logger.info('Outgoing response', {
            statusCode: res.statusCode,
            body,
        });

        res.send = originalSend; // Reset send method to its original implementation
        return res.send(body);
    };

    next();
};

export default responseLogger;
