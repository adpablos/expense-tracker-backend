// src/types/express/index.d.ts

import { User } from '../../models/User';

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
    }
  }
}

export {};
