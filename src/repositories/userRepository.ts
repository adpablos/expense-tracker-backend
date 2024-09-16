import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import logger from '../config/logger';
import { User } from '../models/User';
import { DI_TYPES } from '../types/di';
import { DatabaseError } from '../types/errors';
import { AppError } from '../utils/AppError';

@injectable()
export class UserRepository {
  constructor(@inject(DI_TYPES.Pool) private db: Pool & { connect: () => Promise<PoolClient> }) {}

  async createUserWithClient(client: PoolClient, user: User): Promise<User> {
    try {
      const dbUser = user.toDatabase();
      const result = await client.query(
        'INSERT INTO users (id, email, name, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [dbUser.id, dbUser.email, dbUser.name, dbUser.auth_provider_id]
      );
      logger.debug('User created in database', { userId: result.rows[0].id });
      return User.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Database error while creating user', { error });
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
          throw new AppError('User with this email or auth provider ID already exists', 409);
        }
        throw new AppError(`Error creating user: ${dbError.message}`, 500);
      }
      throw new AppError('Error creating user', 500);
    }
  }

  async createUser(user: User): Promise<User> {
    const client = await this.db.connect();
    try {
      return await this.createUserWithClient(client, user);
    } finally {
      client.release();
    }
  }

  async updateUserWithClient(
    client: PoolClient,
    id: string,
    updates: Partial<User>
  ): Promise<User> {
    try {
      const result = await client.query(
        'UPDATE users SET email = $1, name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [updates.email, updates.name, id]
      );
      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }
      const updatedUser = User.fromDatabase(result.rows[0]);

      if (updates.households) {
        await client.query('DELETE FROM household_members WHERE user_id = $1', [id]);
        for (const householdId of updates.households) {
          await client.query(
            'INSERT INTO household_members (user_id, household_id) VALUES ($1, $2)',
            [id, householdId]
          );
        }
      }

      logger.debug('User updated in database', { userId: updatedUser.id });
      return updatedUser;
    } catch (error) {
      logger.error('Database error while updating user', { error });
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

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const client = await this.db.connect();
    try {
      return await this.updateUserWithClient(client, id, updates);
    } finally {
      client.release();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return User.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Database error while fetching user by ID', { error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const result = await this.db.query('DELETE FROM users WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        throw new AppError('User not found', 404);
      }
      logger.debug('User deleted from database', { userId: id });
    } catch (error) {
      logger.error('Database error while deleting user', { error });
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting user', 500);
    }
  }

  async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
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
        return null;
      }

      const userData = userResult.rows[0];
      return new User(
        userData.email,
        userData.name,
        userData.auth_provider_id,
        userData.id,
        userData.households.filter((h: string | null): h is string => h !== null)
      );
    } catch (error) {
      logger.error('Database error while fetching user by auth provider ID', { error });
      throw new AppError('Error fetching user', 500);
    }
  }

  async removeUserFromAllHouseholds(userId: string): Promise<void> {
    await this.db.query('DELETE FROM household_members WHERE user_id = $1', [userId]);
    logger.debug('Removed user from all households', { userId });
  }
}
