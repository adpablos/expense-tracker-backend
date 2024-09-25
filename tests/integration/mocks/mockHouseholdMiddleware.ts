import { Response, NextFunction } from 'express';
import { injectable, inject, Container } from 'inversify';
import { Pool } from 'pg';

import { HouseholdMiddleware } from '../../../src/middleware/householdMiddleware';
import { HouseholdService } from '../../../src/services/householdService';
import { DI_TYPES } from '../../../src/types/di';
import { ExtendedRequest, ExtendedRequestHandler } from '../../../src/types/express';
import { AppError } from '../../../src/utils/AppError';
import { TestData } from '../setup/testData';

@injectable()
export class MockHouseholdMiddleware extends HouseholdMiddleware {
  private testHouseholdId: string | null = null;

  constructor(
    @inject(DI_TYPES.DbPool) private pool: Pool,
    @inject(DI_TYPES.HouseholdService) householdService: HouseholdService
  ) {
    super(householdService);
  }

  private async getTestHouseholdId(): Promise<string> {
    if (!this.testHouseholdId) {
      const result = await this.pool.query('SELECT id FROM households WHERE name = $1 LIMIT 1', [
        'Test Household',
      ]);
      if (result.rows.length === 0) {
        throw new AppError('Test household not found in database', 500);
      }
      this.testHouseholdId = result.rows[0].id;
    }
    return this.testHouseholdId as string;
  }

  public setCurrentHousehold: ExtendedRequestHandler = async (
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }
    const client = await this.pool.connect();
    try {
      const testData = new TestData();
      await testData.initialize(client);
      req.currentHouseholdId = testData.testHousehold.id;
      next();
    } finally {
      client.release();
    }
  };

  public ensureHouseholdSelected: ExtendedRequestHandler = async (
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.currentHouseholdId) {
      try {
        req.currentHouseholdId = await this.getTestHouseholdId();
      } catch (error) {
        return next(new AppError('No household selected', 400));
      }
    }
    next();
  };
}

export function mockHouseholdMiddleware(container: Container): void {
  container.rebind<HouseholdMiddleware>(DI_TYPES.HouseholdMiddleware).to(MockHouseholdMiddleware);
}