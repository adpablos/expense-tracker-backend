import { injectable, inject } from 'inversify';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { HouseholdRepository } from '../repositories/householdRepository';
import { UserRepository } from '../repositories/userRepository';
import { UserHouseholdTransactionCoordinator } from '../transaction-coordinators/userHouseholdTransactionCoordinator';
import { DI_TYPES } from '../types/di';
import { AppError } from '../utils/AppError';

@injectable()
export class UserService {
  constructor(
    @inject(DI_TYPES.UserRepository) private userRepository: UserRepository,
    @inject(DI_TYPES.HouseholdRepository) private householdRepository: HouseholdRepository,
    @inject(DI_TYPES.UserHouseholdTransactionCoordinator)
    private userHouseholdCoordinator: UserHouseholdTransactionCoordinator
  ) {}

  async createUser(user: User): Promise<User> {
    logger.info('Creating user', { email: user.email });

    const errors = user.validate();
    if (errors.length > 0) {
      logger.warn('Invalid user data', { errors });
      throw new AppError(`Invalid user: ${errors.join(', ')}`, 400);
    }

    try {
      const createdUser = await this.userRepository.createUser(user);
      logger.info('Created user', { user: createdUser });
      return createdUser;
    } catch (error) {
      logger.error('Error creating user', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error creating user', 500);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    logger.info('Updating user', { id, updates });
    try {
      const updatedUser = await this.userRepository.updateUser(id, updates);
      logger.info('Updated user', { user: updatedUser });
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating user', 500);
    }
  }

  async createUserWithHousehold(
    user: User,
    householdName: string
  ): Promise<{ user: User; household: Household }> {
    logger.info('Creating user with household', { email: user.email, householdName });

    const errors = user.validate();
    if (errors.length > 0) {
      logger.warn('Invalid user data', { errors });
      throw new AppError(`Invalid user: ${errors.join(', ')}`, 400);
    }

    // Verify if user already exists
    const existingUser = await this.userRepository.getUserByAuthProviderId(user.authProviderId);
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    try {
      // Delegate the creation of user and household to the transaction coordinator
      return await this.userHouseholdCoordinator.createUserWithHousehold(user, householdName);
    } catch (error) {
      logger.error('Error creating user with household', { error });
      throw new AppError('Error creating user with household', 500);
    }
  }

  async getUserById(id: string): Promise<User | null> {
    logger.info('Fetching user by ID', { id });
    try {
      const user = await this.userRepository.getUserById(id);
      logger.info('Fetched user', { user });
      return user;
    } catch (error) {
      logger.error('Error fetching user', { error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
    logger.info('Fetching user by auth provider ID', { authProviderId });
    try {
      const user = await this.userRepository.getUserByAuthProviderId(authProviderId);
      logger.info('Fetched user', { user });
      return user;
    } catch (error) {
      logger.error('Error fetching user', { error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async deleteUser(id: string): Promise<void> {
    logger.info('Deleting user', { id });
    try {
      const userHouseholds = await this.householdRepository.getUserHouseholds(id);
      await this.handleUserHouseholds(id, userHouseholds);
      await this.userRepository.removeUserFromAllHouseholds(id);
      await this.userRepository.deleteUser(id);
      logger.info('Deleted user', { id });
    } catch (error) {
      logger.error('Error deleting user', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting user', 500);
    }
  }

  private async handleUserHouseholds(userId: string, households: Household[]): Promise<void> {
    for (const household of households) {
      const members = await this.householdRepository.getMembers(household.id);
      if (members.length === 1) {
        await this.householdRepository.deleteOrphanedHousehold(household.id);
      } else if (members.find((m) => m.userId === userId && m.role === 'owner')) {
        await this.householdRepository.transferHouseholdOwnership(userId, household.id);
      }
    }
  }
}
