// src/types/global.d.ts

// Import the User model to extend the Express Request interface
import { User } from '../models/User';

// Extend the Express Request interface to include custom properties
declare global {
  namespace Express {
    export interface Request {
      auth?: {
        sub: string;
        email: string;
      };
      user?: User;
      currentHouseholdId?: string;
      startTime: number;
      requestId?: string;
    }
  }
}
