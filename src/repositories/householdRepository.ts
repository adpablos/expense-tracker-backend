import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import { DI_TYPES } from '../config/di';
import logger from '../config/logger';
import { ROLES, STATUS } from '../constants';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { AppError } from '../utils/AppError';

import { DatabaseError } from './errors';

@injectable()
export class HouseholdRepository {
  constructor(@inject(DI_TYPES.DbPool) private db: Pool & { connect: () => Promise<PoolClient> }) {}

  async createWithClient(client: PoolClient, household: Household): Promise<Household> {
    try {
      const dbHousehold = household.toDatabase();
      const householdResult = await client.query(
        'INSERT INTO households (id, name) VALUES ($1, $2) RETURNING *',
        [dbHousehold.id, dbHousehold.name]
      );
      if (householdResult.rows.length === 0) {
        throw new Error('Household could not be created');
      }
      logger.debug('Household created in database', { householdId: householdResult.rows[0].id });
      return Household.fromDatabase(householdResult.rows[0]);
    } catch (error) {
      logger.error('Database error while creating household', { error });
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
          throw new AppError('Duplicate entry: Household already exists', 409);
        }
        throw new AppError(`Error creating household: ${dbError.message}`, 500);
      }
      throw new AppError('Error creating household', 500);
    }
  }

  async create(household: Household): Promise<Household> {
    const client = await this.db.connect();
    try {
      return await this.createWithClient(client, household);
    } finally {
      client.release();
    }
  }

  async getHouseholdById(id: string): Promise<Household | null> {
    const result = await this.db.query('SELECT * FROM households WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      logger.debug('Household not found in database', { householdId: id });
    }
    return result.rows.length > 0 ? Household.fromDatabase(result.rows[0]) : null;
  }

  async isMember(householdId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = $3',
      [householdId, userId, STATUS.ACTIVE]
    );
    return result.rows.length > 0;
  }

  async addMemberWithClient(client: PoolClient, householdMember: HouseholdMember): Promise<void> {
    try {
      await client.query(
        'INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
        [
          householdMember.householdId,
          householdMember.userId,
          householdMember.role,
          householdMember.status,
        ]
      );
      logger.debug('Member added to household', {
        householdId: householdMember.householdId,
        userId: householdMember.userId,
        role: householdMember.role,
        status: householdMember.status,
      });
    } catch (error) {
      logger.error('Error adding member to household', { error, householdMember });
      throw new AppError(`Error adding member to household: ${(error as Error).message}`, 500);
    }
  }

  async addMember(householdMember: HouseholdMember): Promise<void> {
    const client = await this.db.connect();
    try {
      await this.addMemberWithClient(client, householdMember);
    } finally {
      client.release();
    }
  }

  async updateMemberStatus(householdId: string, userId: string, status: string): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE household_members SET status = $1 WHERE household_id = $2 AND user_id = $3 RETURNING *',
      [status, householdId, userId]
    );
    if (result.rows.length === 0) {
      logger.debug('Failed to update member status', { householdId, userId, status });
    }
    return result.rows.length > 0;
  }

  async removeMember(householdId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2 RETURNING *',
      [householdId, userId]
    );
    if (result.rowCount === 0) {
      logger.debug('Failed to remove member from household', { householdId, userId });
    }
    return (result.rowCount ?? 0) > 0;
  }

  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    const result = await this.db.query('SELECT * FROM household_members WHERE household_id = $1', [
      householdId,
    ]);
    logger.debug('Retrieved household members', { householdId, count: result.rows.length });
    return result.rows.map(HouseholdMember.fromDatabase);
  }

  async getUserHouseholds(userId: string): Promise<Household[]> {
    try {
      const result = await this.db.query(
        `SELECT h.* 
         FROM households h
         JOIN household_members hm ON h.id = hm.household_id
         WHERE hm.user_id = $1`,
        [userId]
      );

      return result.rows.map((row) => new Household(row.name, row.id));
    } catch (error) {
      logger.error('Database error while fetching user households', { error });
      throw new AppError('Error fetching user households', 500);
    }
  }

  async getDefaultHouseholdForUser(userId: string): Promise<Household | null> {
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
      logger.debug('No default household found for user', { userId });
    }
    return result.rows.length > 0 ? Household.fromDatabase(result.rows[0]) : null;
  }

  async deleteOrphanedHousehold(householdId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
      await client.query('DELETE FROM households WHERE id = $1', [householdId]);
      await client.query('COMMIT');
      logger.debug('Deleted orphaned household', { householdId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting orphaned household', { error, householdId });
      throw new AppError('Error deleting orphaned household', 500);
    } finally {
      client.release();
    }
  }

  async transferHouseholdOwnership(currentOwnerId: string, householdId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      logger.debug('Starting transferHouseholdOwnership for household:', householdId);

      await client.query('BEGIN');

      logger.debug('Checking current owner', { householdId, currentOwnerId });
      const currentOwnerCheck = await client.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2 AND role = $3',
        [householdId, currentOwnerId, ROLES.OWNER]
      );
      logger.debug('Current owner check result:', currentOwnerCheck.rows);

      if (currentOwnerCheck.rows.length === 0) {
        logger.warn('Current user is not the owner', { householdId, currentOwnerId });
        await client.query('ROLLBACK');
        logger.debug('Transaction rolled back.');
        throw new AppError('Current user is not the owner', 400);
      }

      logger.debug('Finding new owner', { householdId, currentOwnerId });
      const newOwnerResult = await client.query(
        'SELECT user_id FROM household_members WHERE household_id = $1 AND user_id != $2 AND status = $3 ORDER BY created_at ASC LIMIT 1',
        [householdId, currentOwnerId, STATUS.ACTIVE]
      );
      logger.debug('New owner query result:', newOwnerResult.rows);

      if (newOwnerResult.rows.length === 0) {
        logger.warn('No eligible member found to transfer ownership', {
          householdId,
          currentOwnerId,
        });
        await client.query('ROLLBACK');
        throw new AppError('No eligible member found to transfer ownership', 400);
      }

      const newOwnerId = newOwnerResult.rows[0].user_id;
      logger.debug(`Updating user ${newOwnerId} to OWNER...`, { householdId, newOwnerId });
      const updateResult = await client.query(
        'UPDATE household_members SET role = $1 WHERE household_id = $2 AND user_id = $3',
        [ROLES.OWNER, householdId, newOwnerId]
      );
      logger.debug('🔄 Update result:', updateResult.rowCount, 'rows affected.');
      logger.debug('Transferred household ownership', { householdId, newOwnerId });

      logger.debug('🗑️ Removing current OWNER from household...');
      const deleteResult = await client.query(
        'DELETE FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, currentOwnerId]
      );
      logger.debug('Delete result:', deleteResult.rowCount, 'rows affected.');

      await client.query('COMMIT');
      logger.debug('Household ownership transfer completed', { householdId });
      logger.debug('✅ Transaction committed successfully. Ownership transfer completed.');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error transferring household ownership', {
        error,
        householdId,
        currentOwnerId,
      });
      logger.error('❌ Error transferring household ownership:', error);

      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError('Error transferring household ownership', 500);
      }
    } finally {
      client.release();
      logger.debug('Database client released.');
    }
  }

  async getMember(householdId: string, userId: string): Promise<HouseholdMember | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2',
        [householdId, userId]
      );
      return result.rows.length > 0 ? HouseholdMember.fromDatabase(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error getting household member', { error, householdId, userId });
      throw new AppError('Error getting household member', 500);
    }
  }
}
