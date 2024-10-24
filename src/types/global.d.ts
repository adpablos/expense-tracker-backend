// src/types/global.d.ts

// Import the User model to extend the Express Request interface
import { User } from '../models/User';

// Extend the Express Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string;
        email: string;
      };
      user?: User;
      currentHouseholdId?: string;
      startTime: number;
    }
  }
}

// Export an empty object to ensure this file is treated as a module
export {};
