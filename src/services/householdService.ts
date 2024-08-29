import { Pool } from 'pg';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { User } from '../models/User';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

export class HouseholdService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createHousehold(household: Household, user: User): Promise<Household> {
    logger.info('Creating household', { name: household.name, userId: user.id });

    const errors = household.validate();
    if (errors.length > 0) {
      logger.warn('Invalid household data', { errors });
      throw new AppError(`Invalid household: ${errors.join(', ')}`, 400);
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query('SELECT * FROM users WHERE auth_provider_id = $1', [
        user.authProviderId,
      ]);
      if (existingUser.rows.length > 0) {
        throw new AppError('User already exists', 409);
      }

      // Insert the user
      const userResult = await client.query(
        'INSERT INTO users (id, email, name, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [user.id, user.email, user.name, user.authProviderId]
      );

      // Insert the household
      const dbHousehold = household.toDatabase();
      const householdResult = await client.query(
        'INSERT INTO households (id, name) VALUES ($1, $2) RETURNING *',
        [dbHousehold.id, dbHousehold.name]
      );
      const createdHousehold = Household.fromDatabase(householdResult.rows[0]);

      // Create the household member entry
      const householdMember = {
        id: uuidv4(),
        householdId: createdHousehold.id,
        userId: userResult.rows[0].id,
        role: 'owner',
        status: 'active',
      };
      await client.query(
        'INSERT INTO household_members (id, household_id, user_id, role, status) VALUES ($1, $2, $3, $4, $5)',
        [
          householdMember.id,
          householdMember.householdId,
          householdMember.userId,
          householdMember.role,
          householdMember.status,
        ]
      );

      await client.query('COMMIT');

      logger.info('Created household', { household: createdHousehold, userId: user.id });
      return createdHousehold;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      logger.error('Error creating household', { error });
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
          throw new AppError('Duplicate entry: User or Household already exists', 409);
        }
        throw new AppError(`Error creating household: ${dbError.message}`, 500);
      }
      throw new AppError('Error creating household', 500);
    } finally {
      client.release();
    }
  }

  async getHouseholdById(id: string): Promise<Household> {
    logger.info('Fetching household by ID', { id });
    try {
      const result = await this.db.query('SELECT * FROM households WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        logger.info('Household not found', { id });
        throw new AppError('Household not found', 404);
      }
      const household = Household.fromDatabase(result.rows[0]);
      logger.info('Fetched household', { household });
      return household;
    } catch (error) {
      logger.error('Error fetching household', { error: error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error fetching household', 500);
    }
  }

  async isMember(householdId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = $3',
        [householdId, userId, 'active']
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking household membership', { error: error });
      throw new AppError('Error checking household membership', 500);
    }
  }

  async inviteMember(householdId: string, invitedUserId: string, inviterId: string): Promise<void> {
    try {
      const isInviterMember = await this.isMember(householdId, inviterId);
      if (!isInviterMember) {
        throw new AppError('You are not a member of this household', 403);
      }

      const existingMember = await this.db.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, invitedUserId]
      );

      if (existingMember.rows.length > 0) {
        throw new AppError('User is already a member or invited to this household', 400);
      }

      const householdMember = new HouseholdMember(householdId, invitedUserId, 'member', 'invited');
      await this.db.query(
        'INSERT INTO household_members (id, household_id, user_id, role, status) VALUES ($1, $2, $3, $4, $5)',
        [
          householdMember.id,
          householdMember.householdId,
          householdMember.userId,
          householdMember.role,
          householdMember.status,
        ]
      );

      logger.info('Invited member to household', { householdId, invitedUserId });
    } catch (error) {
      logger.error('Error inviting member to household', { error: error });
      throw error instanceof AppError
        ? error
        : new AppError('Error inviting member to household', 500);
    }
  }

  async acceptInvitation(householdId: string, userId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'UPDATE household_members SET status = $1 WHERE household_id = $2 AND user_id = $3 AND status = $4 RETURNING *',
        ['active', householdId, userId, 'invited']
      );

      if (result.rows.length === 0) {
        throw new AppError('No valid invitation found', 404);
      }

      logger.info('Accepted household invitation', { householdId, userId });
    } catch (error) {
      logger.error('Error accepting household invitation', { error: error });
      throw error instanceof AppError
        ? error
        : new AppError('Error accepting household invitation', 500);
    }
  }

  async rejectInvitation(householdId: string, userId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = $3',
        [householdId, userId, 'invited']
      );

      if (result.rowCount === 0) {
        throw new AppError('No valid invitation found', 404);
      }

      logger.info('Rejected household invitation', { householdId, userId });
    } catch (error) {
      logger.error('Error rejecting household invitation', { error: error });
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

      // Primero, verificamos si el household existe
      const householdExists = await this.householdExists(householdId);
      if (!householdExists) {
        throw new AppError('Household not found', 404);
      }

      const result = await this.db.query(
        'SELECT * FROM household_members WHERE household_id = $1',
        [householdId]
      );
      return result.rows.map(HouseholdMember.fromDatabase);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error fetching household members', { error: error });
      throw new AppError('Error fetching household members', 500);
    }
  }

  async removeMember(householdId: string, userId: string, removerId: string): Promise<void> {
    try {
      const removerMember = await this.db.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, removerId]
      );

      if (removerMember.rows.length === 0 || removerMember.rows[0].role !== 'owner') {
        throw new AppError('You do not have permission to remove members', 403);
      }

      const result = await this.db.query(
        'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2 AND user_id != $3 RETURNING *',
        [householdId, userId, removerId]
      );

      if (result.rowCount === 0) {
        throw new AppError('Member not found or cannot remove yourself', 404);
      }

      logger.info('Removed member from household', { householdId, userId });
    } catch (error) {
      logger.error('Error removing member from household', { error: error });
      throw error instanceof AppError
        ? error
        : new AppError('Error removing member from household', 500);
    }
  }

  async getUserHouseholds(userId: string): Promise<Household[]> {
    logger.info('Fetching households for user', { userId });
    try {
      const result = await this.db.query(
        `SELECT h.* 
                 FROM households h
                 JOIN household_members hm ON h.id = hm.household_id
                 WHERE hm.user_id = $1`,
        [userId]
      );
      const households = result.rows.map(Household.fromDatabase);
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
      const result = await this.db.query(
        'SELECT 1 FROM household_members WHERE user_id = $1 AND household_id = $2',
        [userId, householdId]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking user access to household', { error, userId, householdId });
      throw new AppError('Error checking user access to household', 500);
    }
  }

  async getDefaultHouseholdForUser(userId: string): Promise<Household | null> {
    try {
      const result = await this.db.query(
        `SELECT h.*
                 FROM households h
                          JOIN household_members hm ON h.id = hm.household_id
                 WHERE hm.user_id = $1
                 ORDER BY hm.created_at
                 LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Household.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error getting default household for user', { error, userId });
      throw new AppError('Error getting default household for user', 500);
    }
  }

  // Auxiliar method to check if a household exists
  private async householdExists(householdId: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM households WHERE id = $1', [householdId]);
    return result.rows.length > 0;
  }
}
