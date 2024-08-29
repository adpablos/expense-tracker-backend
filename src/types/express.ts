import { Request, Response, NextFunction } from 'express';

import { User } from '../models/User';

export interface ExtendedRequest extends Request {
  auth?: {
    sub: string;
    email: string;
  };
  user?: User;
  currentHouseholdId?: string;
}

export type ExtendedRequestHandler = (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;
