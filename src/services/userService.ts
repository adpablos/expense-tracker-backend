import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

import { HouseholdService } from './householdService';

interface UserHousehold {
  household_id: string;
  role: string;
  household_name: string;
  member_count: string;
}

export class UserService {
  private db: Pool;
  private householdService: HouseholdService;

  constructor(db: Pool) {
    this.db = db;
    this.householdService = new HouseholdService(db);
  }

  async createUser(user: User): Promise<User> {
    logger.info('Creating user', { email: user.email });

    const errors = user.validate();
    if (errors.length > 0) {
      logger.warn('Invalid user data', { errors });
      throw new AppError(`Invalid user: ${errors.join(', ')}`, 400);
    }

    try {
      const dbUser = user.toDatabase();
      const result = await this.db.query(
        'INSERT INTO users (id, email, name, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [dbUser.id, dbUser.email, dbUser.name, dbUser.auth_provider_id]
      );
      const createdUser = User.fromDatabase(result.rows[0]);
      logger.info('Created user', { user: createdUser });
      return createdUser;
    } catch (error: unknown) {
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        logger.error('Error creating user', { error: dbError });
        if (dbError.code === '23505') {
          throw new AppError('User with this email or auth provider ID already exists', 409);
        }
      }
      throw new AppError(`Error creating user`, 500);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    logger.info('Updating user', { id, updates });
    try {
      const result = await this.db.query(
        'UPDATE users SET email = $1, name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [updates.email, updates.name, id]
      );
      if (result.rows.length === 0) {
        logger.warn('User not found', { id });
        throw new AppError('User not found', 404);
      }
      const updatedUser = User.fromDatabase(result.rows[0]);

      // Get all households the user is a member of
      const householdsResult = await this.db.query(
        'SELECT household_id FROM household_members WHERE user_id = $1',
        [id]
      );
      updatedUser.households = householdsResult.rows.map((row) => row.household_id);

      logger.info('Updated user', { user: updatedUser });
      return updatedUser;
    } catch (error: unknown) {
      logger.error('Error updating user', { error });
      if (error instanceof AppError) throw error;
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
          throw new AppError('Email already in use', 409);
        }
      }
      throw new AppError('Error updating user', 500);
    }
  }

  async createUserWithHousehold(user: User, householdName: string): Promise<User> {
    logger.info('Creating user with household', { email: user.email, householdName });

    const errors = user.validate();
    if (errors.length > 0) {
      logger.warn('Invalid user data', { errors });
      throw new AppError(`Invalid user: ${errors.join(', ')}`, 400);
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Create user
      const dbUser = user.toDatabase();
      const userResult = await client.query(
        'INSERT INTO users (id, email, name, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [dbUser.id, dbUser.email, dbUser.name, dbUser.auth_provider_id]
      );

      // Create household object
      const newHousehold = new Household(householdName, uuidv4());

      // Create household
      const household = await this.householdService.createHousehold(
        newHousehold,
        userResult.rows[0].id
      );

      // Update user with household ID (through household_members table)
      await client.query(
        'INSERT INTO household_members (id, household_id, user_id, role, status) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), household.id, userResult.rows[0].id, 'owner', 'active']
      );

      await client.query('COMMIT');

      const createdUser = User.fromDatabase({
        ...userResult.rows[0],
        households: [household.id],
      });
      logger.info('Created user with household', { user: createdUser, householdId: household.id });
      return createdUser;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        logger.error('Error creating user with household', {
          error: error.message,
          stack: error.stack,
          user: user,
          householdName,
        });
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
          throw new AppError('User with this email or auth provider ID already exists', 409);
        }
        throw new AppError(`Error creating user with household: ${error.message}`, 500);
      }
      throw new AppError('Error creating user with household', 500);
    } finally {
      client.release();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    logger.info('Fetching user by ID', { id: id });
    try {
      const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        logger.info('User not found', { id: id });
        return null;
      }
      const user = User.fromDatabase(result.rows[0]);
      logger.info('Fetched user', { user });
      return user;
    } catch (error) {
      logger.error('Error fetching user', { error: error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
    logger.info('Fetching user by auth provider ID', { authProviderId });
    try {
      const userResult = await this.db.query(
        `SELECT u.*, array_agg(hm.household_id) as households
                 FROM users u
                 LEFT JOIN household_members hm ON u.id = hm.user_id
                 WHERE u.auth_provider_id = $1
                 GROUP BY u.id`,
        [authProviderId]
      );

      if (userResult.rows.length === 0) {
        logger.info('User not found', { authProviderId });
        return null;
      }

      const userData = userResult.rows[0];
      const user = new User(
        userData.email,
        userData.name,
        userData.auth_provider_id,
        userData.id,
        userData.households.filter((h: string | null): h is string => h !== null) // Explicit type guard
      );

      logger.info('Fetched user', { user });
      return user;
    } catch (error) {
      logger.error('Error fetching user', { error: error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async deleteUser(id: string): Promise<void> {
    logger.info('Deleting user', { id });
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const userHouseholds = await this.getUserHouseholds(client, id);
      await this.handleUserHouseholds(client, id, userHouseholds);
      await this.removeUserFromHouseholds(client, id);
      await this.deleteUserRecord(client, id);

      await client.query('COMMIT');
      logger.info('Deleted user', { id });
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        logger.error('Error deleting user', { error: error });
        if (error instanceof AppError) throw error;
      }
      throw new AppError('Error deleting user', 500);
    } finally {
      client.release();
    }
  }

  private async getUserHouseholds(client: PoolClient, userId: string): Promise<UserHousehold[]> {
    const result = await client.query(
      'SELECT hm.household_id, hm.role, h.name as household_name, ' +
        '(SELECT COUNT(*) FROM household_members WHERE household_id = hm.household_id) as member_count ' +
        'FROM household_members hm ' +
        'JOIN households h ON h.id = hm.household_id ' +
        'WHERE hm.user_id = $1',
      [userId]
    );
    return result.rows;
  }

  private async handleUserHouseholds(
    client: PoolClient,
    userId: string,
    households: UserHousehold[]
  ): Promise<void> {
    for (const household of households) {
      if (household.member_count === '1') {
        await this.deleteOrphanedHousehold(
          client,
          household.household_id,
          household.household_name
        );
      } else if (household.role === 'owner') {
        await this.transferHouseholdOwnership(
          client,
          userId,
          household.household_id,
          household.household_name
        );
      }
    }
  }

  private async deleteOrphanedHousehold(
    client: PoolClient,
    householdId: string,
    householdName: string
  ): Promise<void> {
    // First, delete all members of the household
    await client.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
    // Then, delete the household
    await client.query('DELETE FROM households WHERE id = $1', [householdId]);
    logger.info(`Deleted orphaned household ${householdName}`, { householdId });
  }

  private async transferHouseholdOwnership(
    client: PoolClient,
    currentOwnerId: string,
    householdId: string,
    householdName: string
  ): Promise<void> {
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
      logger.info(`Transferred ownership of household ${householdName}`, {
        householdId,
        newOwnerId,
      });
    }
  }

  private async removeUserFromHouseholds(client: PoolClient, userId: string): Promise<void> {
    await client.query('DELETE FROM household_members WHERE user_id = $1', [userId]);
  }

  private async deleteUserRecord(client: PoolClient, userId: string): Promise<void> {
    const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      logger.warn('User not found', { userId });
      throw new AppError('User not found', 404);
    }
  }
}
