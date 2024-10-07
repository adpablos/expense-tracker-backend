import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { User } from '../models/User';
import { HouseholdRepository } from '../repositories/householdRepository';
import { UserRepository } from '../repositories/userRepository';
import { DI_TYPES } from '../config/di';
import { AppError } from '../utils/AppError';

@injectable()
export class UserHouseholdTransactionCoordinator {
  constructor(
    @inject(DI_TYPES.UserRepository) private userRepository: UserRepository,
    @inject(DI_TYPES.HouseholdRepository) private householdRepository: HouseholdRepository,
    @inject(DI_TYPES.DbPool) private dbPool: Pool
  ) {}

  async createUserWithHousehold(
    user: User,
    householdName: string,
    client?: PoolClient
  ): Promise<{ user: User; household: Household }> {
    const shouldManageTransaction = !client;
    const dbClient = client || (await this.dbPool.connect());

    try {
      if (shouldManageTransaction) await dbClient.query('BEGIN');

      // User creation
      const createdUser = await this.userRepository.createUserWithClient(dbClient, user);
      logger.debug('Created user:', { user: createdUser });

      // Household creation
      const household = new Household(householdName);
      const createdHousehold = await this.householdRepository.createWithClient(dbClient, household);
      logger.debug('Created household:', { household: createdHousehold });

      // Add user to household
      const householdMember = new HouseholdMember(
        createdHousehold.id,
        createdUser.id,
        'owner',
        'active'
      );
      logger.debug('Creating household member:', { householdMember });
      await this.householdRepository.addMemberWithClient(dbClient, householdMember);

      // Update user with household
      createdUser.households = [createdHousehold.id];
      logger.debug('Updating user with household:', { user: createdUser });
      const updatedUser = await this.userRepository.updateUserWithClient(dbClient, createdUser.id, {
        householdUpdates: [
          {
            householdId: createdHousehold.id,
            role: 'owner',
            status: 'active',
          },
        ],
      });
      logger.debug('Updated user:', { user: updatedUser });

      if (shouldManageTransaction) await dbClient.query('COMMIT');

      return { user: updatedUser, household: createdHousehold };
    } catch (error) {
      if (shouldManageTransaction) await dbClient.query('ROLLBACK');
      logger.error('Error in createUserWithHousehold:', { error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error creating user with household', 500);
    } finally {
      if (shouldManageTransaction) dbClient.release();
    }
  }
}
