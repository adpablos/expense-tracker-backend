// global.d.ts

import { User } from './src/models/User';

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

export {};
