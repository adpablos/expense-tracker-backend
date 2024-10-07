import { injectable, inject } from 'inversify';

import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { ROLES } from '../constants';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { HouseholdRepository } from '../repositories/householdRepository';
import { UserRepository } from '../repositories/userRepository';
import { UserHouseholdTransactionCoordinator } from '../transaction-coordinators/userHouseholdTransactionCoordinator';
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

    try {
      // Verify if user already exists
      const existingUser = await this.userRepository.getUserByAuthProviderId(user.authProviderId);
      if (existingUser) {
        logger.warn('User already exists', { authProviderId: user.authProviderId });
        throw new AppError('User already exists', 409);
      }

      // Delegate the creation of user and household to the transaction coordinator
      return await this.userHouseholdCoordinator.createUserWithHousehold(user, householdName);
    } catch (error) {
      logger.error('Error creating user with household', { error });
      if (error instanceof AppError) {
        throw error; // Propagar el error original si es un AppError
      }
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
    logger.debug('getUserByAuthProviderId called', { authProviderId });
    try {
      const user = await this.userRepository.getUserByAuthProviderId(authProviderId);
      logger.debug('User fetched from repository', { user });
      return user;
    } catch (error) {
      logger.error('Error fetching user by auth provider ID', { error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async deleteUser(id: string): Promise<void> {
    logger.info('Deleting user', { id });
    try {
      logger.debug('Fetching user households...');
      const userHouseholds = await this.householdRepository.getUserHouseholds(id);
      logger.debug('User households:', { userHouseholds });

      logger.debug('Handling user households...');
      await this.handleUserHouseholds(id, userHouseholds);

      logger.debug('Removing user from all households...');
      await this.userRepository.removeUserFromAllHouseholds(id);

      logger.debug('Deleting user...');
      await this.userRepository.deleteUser(id);
      logger.info('Deleted user', { id });
    } catch (error) {
      logger.error('Error deleting user', { error, stack: (error as Error).stack });
      if (error instanceof AppError) throw error;
      throw new AppError(`Error deleting user: ${(error as Error).message}`, 500);
    }
  }

  private async handleUserHouseholds(userId: string, households: Household[]): Promise<void> {
    logger.debug('Handling user households for user:', { userId });
    logger.debug('Number of households:', { count: households.length });
    for (const household of households) {
      const members = await this.householdRepository.getMembers(household.id);
      logger.debug('Household members:', { householdId: household.id, members });

      const userMember = members.find((m) => m.userId === userId);
      logger.debug('User member:', { userMember });

      if (userMember && userMember.role === ROLES.OWNER) {
        logger.debug('User is owner, transferring ownership', { householdId: household.id });
        await this.householdRepository.transferHouseholdOwnership(userId, household.id);
      } else if (members.length === 1) {
        logger.debug('Household has only one member, deleting orphaned household', {
          householdId: household.id,
        });
        await this.householdRepository.deleteOrphanedHousehold(household.id);
      } else {
        logger.debug('User is not owner, removing from household', { householdId: household.id });
        await this.householdRepository.removeMember(household.id, userId);
      }
    }
  }
}
