import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { DI_TYPES } from '../types/di';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

@injectable()
export class HouseholdRepository {
  constructor(@inject(DI_TYPES.Pool) private db: Pool & { connect: () => Promise<PoolClient> }) {}

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

  async getById(id: string): Promise<Household | null> {
    const result = await this.db.query('SELECT * FROM households WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      logger.debug('Household not found in database', { householdId: id });
    }
    return result.rows.length > 0 ? Household.fromDatabase(result.rows[0]) : null;
  }

  async isMember(householdId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = $3',
      [householdId, userId, 'active']
    );
    return result.rows.length > 0;
  }

  async addMemberWithClient(client: PoolClient, householdMember: HouseholdMember): Promise<void> {
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
    logger.debug('Member added to household', {
      householdId: householdMember.householdId,
      userId: householdMember.userId,
      role: householdMember.role,
      status: householdMember.status,
    });
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
    const result = await this.db.query(
      `SELECT h.* 
       FROM households h
       JOIN household_members hm ON h.id = hm.household_id
       WHERE hm.user_id = $1`,
      [userId]
    );
    logger.debug('Retrieved user households', { userId, count: result.rows.length });
    return result.rows.map(Household.fromDatabase);
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
      await client.query('BEGIN');
      const newOwnerResult = await client.query(
        'SELECT user_id FROM household_members WHERE household_id = $1 AND user_id != $2 LIMIT 1',
        [householdId, currentOwnerId]
      );
      if (newOwnerResult.rows.length > 0) {
        const newOwnerId = newOwnerResult.rows[0].user_id;
        await client.query(
          'UPDATE household_members SET role = $1 WHERE household_id = $2 AND user_id = $3',
          ['owner', householdId, newOwnerId]
        );
        logger.debug('Transferred household ownership', { householdId, newOwnerId });
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error transferring household ownership', {
        error,
        householdId,
        currentOwnerId,
      });
      throw new AppError('Error transferring household ownership', 500);
    } finally {
      client.release();
    }
  }
}
