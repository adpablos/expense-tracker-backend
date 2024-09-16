import { Pool } from 'pg';

import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { User } from '../models/User';
import { HouseholdRepository } from '../repositories/householdRepository';
import { UserRepository } from '../repositories/userRepository';
import { AppError } from '../utils/AppError';

export class UserHouseholdTransactionCoordinator {
  constructor(
    private userRepository: UserRepository,
    private householdRepository: HouseholdRepository,
    private dbPool: Pool
  ) {}

  async createUserWithHousehold(
    user: User,
    householdName: string
  ): Promise<{ user: User; household: Household }> {
    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');

      // User creation
      const createdUser = await this.userRepository.createUserWithClient(client, user);

      // Household creation
      const household = new Household(householdName);
      const createdHousehold = await this.householdRepository.createWithClient(client, household);

      // Add user to household
      const householdMember = new HouseholdMember(
        createdHousehold.id,
        createdUser.id,
        'owner',
        'active'
      );
      await this.householdRepository.addMemberWithClient(client, householdMember);

      // Update user with household
      createdUser.households = [createdHousehold.id];
      await this.userRepository.updateUserWithClient(client, createdUser.id, createdUser);

      await client.query('COMMIT');

      return { user: createdUser, household: createdHousehold };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new AppError('Error creating user with household', 500);
    } finally {
      client.release();
    }
  }
}
