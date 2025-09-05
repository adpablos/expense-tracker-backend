import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.get('x-request-id');
  const id = incomingId && incomingId.trim().length > 0 ? incomingId : uuidv4();

  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};
