import { injectable, inject } from 'inversify';
import { validate as uuidValidate } from 'uuid';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { User } from '../models/User';
import { HouseholdRepository } from '../repositories/householdRepository';
import { DI_TYPES } from '../config/di';
import { AppError } from '../utils/AppError';

@injectable()
export class HouseholdService {
  constructor(
    @inject(DI_TYPES.HouseholdRepository) private householdRepository: HouseholdRepository
  ) {}

  async createHousehold(household: Household, user: User): Promise<Household> {
    logger.info('Creating household', { name: household.name, userId: user.id });

    const errors = household.validate();
    if (errors.length > 0) {
      logger.warn('Invalid household data', { errors });
      throw new AppError(`Invalid household: ${errors.join(', ')}`, 400);
    }

    try {
      const createdHousehold = await this.householdRepository.create(household);
      const householdMember = new HouseholdMember(createdHousehold.id, user.id, 'owner', 'active');
      await this.householdRepository.addMember(householdMember);

      logger.info('Created household', { household: createdHousehold, userId: user.id });
      return createdHousehold;
    } catch (error) {
      logger.error('Error creating household', { error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error creating household', 500);
    }
  }

  async getHouseholdById(id: string): Promise<Household> {
    logger.info('Fetching household by ID', { id });
    try {
      const household = await this.householdRepository.getHouseholdById(id);
      if (!household) {
        logger.info('Household not found', { id });
        throw new AppError('Household not found', 404);
      }
      logger.info('Fetched household', { household });
      return household;
    } catch (error) {
      logger.error('Error fetching household', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error fetching household', 500);
    }
  }

  async isMember(householdId: string, userId: string): Promise<boolean> {
    try {
      return await this.householdRepository.isMember(householdId, userId);
    } catch (error) {
      logger.error('Error checking household membership', { error });
      throw new AppError('Error checking household membership', 500);
    }
  }

  async inviteMember(householdId: string, invitedUserId: string, inviterId: string): Promise<void> {
    try {
      const isInviterMember = await this.isMember(householdId, inviterId);
      if (!isInviterMember) {
        throw new AppError('You are not a member of this household', 403);
      }

      const existingMember = await this.householdRepository.isMember(householdId, invitedUserId);
      if (existingMember) {
        throw new AppError('User is already a member or invited to this household', 400);
      }

      const householdMember = new HouseholdMember(householdId, invitedUserId, 'member', 'invited');
      await this.householdRepository.addMember(householdMember);

      logger.info('Invited member to household', { householdId, invitedUserId });
    } catch (error) {
      logger.error('Error inviting member to household', { error });
      throw error instanceof AppError
        ? error
        : new AppError('Error inviting member to household', 500);
    }
  }

  async acceptInvitation(householdId: string, userId: string): Promise<void> {
    try {
      const updated = await this.householdRepository.updateMemberStatus(
        householdId,
        userId,
        'active'
      );
      if (!updated) {
        throw new AppError('No valid invitation found', 404);
      }
      logger.info('Accepted household invitation', { householdId, userId });
    } catch (error) {
      logger.error('Error accepting household invitation', { error });
      throw error instanceof AppError
        ? error
        : new AppError('Error accepting household invitation', 500);
    }
  }

  async rejectInvitation(householdId: string, userId: string): Promise<void> {
    try {
      const removed = await this.householdRepository.removeMember(householdId, userId);
      if (!removed) {
        throw new AppError('No valid invitation found', 404);
      }
      logger.info('Rejected household invitation', { householdId, userId });
    } catch (error) {
      logger.error('Error rejecting household invitation', { error });
      throw error instanceof AppError
        ? error
        : new AppError('Error rejecting household invitation', 500);
    }
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    try {
      if (!uuidValidate(householdId)) {
        throw new AppError('Invalid household ID format', 400);
      }

      const household = await this.householdRepository.getHouseholdById(householdId);
      if (!household) {
        throw new AppError('Household not found', 404);
      }

      return await this.householdRepository.getMembers(householdId);
    } catch (error) {
      logger.error('Error fetching household members', { error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error fetching household members', 500);
    }
  }

  async removeMember(householdId: string, userId: string, removerId: string): Promise<void> {
    try {
      const members = await this.householdRepository.getMembers(householdId);
      const remover = members.find((member) => member.userId === removerId);

      if (!remover || remover.role !== 'owner') {
        throw new AppError('You do not have permission to remove members', 403);
      }

      const removed = await this.householdRepository.removeMember(householdId, userId);
      if (!removed) {
        throw new AppError('Member not found or cannot remove yourself', 404);
      }

      logger.info('Removed member from household', { householdId, userId });
    } catch (error) {
      logger.error('Error removing member from household', { error });
      throw error instanceof AppError
        ? error
        : new AppError('Error removing member from household', 500);
    }
  }

  async getUserHouseholds(userId: string): Promise<Household[]> {
    logger.info('Fetching households for user', { userId });
    try {
      const households = await this.householdRepository.getUserHouseholds(userId);
      logger.info('Fetched households for user', { userId, count: households.length });
      return households;
    } catch (error) {
      logger.error('Error fetching households for user', { error, userId });
      throw new AppError('Error fetching households for user', 500);
    }
  }

  async userHasAccessToHousehold(userId: string, householdId: string): Promise<boolean> {
    logger.info(`Checking if user ${userId} has access to household ${householdId}`);
    try {
      return await this.householdRepository.isMember(householdId, userId);
    } catch (error) {
      logger.error('Error checking user access to household', { error, userId, householdId });
      throw new AppError('Error checking user access to household', 500);
    }
  }

  async getDefaultHouseholdForUser(userId: string): Promise<Household | null> {
    try {
      return await this.householdRepository.getDefaultHouseholdForUser(userId);
    } catch (error) {
      logger.error('Error getting default household for user', { error, userId });
      throw new AppError('Error getting default household for user', 500);
    }
  }
}
