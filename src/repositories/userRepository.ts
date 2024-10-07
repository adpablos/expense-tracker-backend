import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';

import logger from '../config/logger';
import { User } from '../models/User';
import { DI_TYPES } from '../config/di';
import { DatabaseError } from './errors';
import { AppError } from '../utils/AppError';

@injectable()
export class UserRepository {
  constructor(@inject(DI_TYPES.DbPool) private db: Pool & { connect: () => Promise<PoolClient> }) {}

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
    updates: Partial<
      User & { householdUpdates?: { householdId: string; role: string; status: string }[] }
    >
  ): Promise<User> {
    try {
      let updateQuery = 'UPDATE users SET updated_at = NOW()';
      const queryParams: (string | Date)[] = [];
      let paramCounter = 1;

      if (updates.email) {
        updateQuery += `, email = $${paramCounter}`;
        queryParams.push(updates.email);
        paramCounter++;
      }

      if (updates.name) {
        updateQuery += `, name = $${paramCounter}`;
        queryParams.push(updates.name);
        paramCounter++;
      }

      updateQuery += ` WHERE id = $${paramCounter} RETURNING *`;
      queryParams.push(id);

      logger.debug('Executing update query', { query: updateQuery, params: queryParams });

      const result = await client.query(updateQuery, queryParams);
      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }
      const updatedUser = User.fromDatabase(result.rows[0]);

      if (updates.householdUpdates) {
        await client.query('DELETE FROM household_members WHERE user_id = $1', [id]);
        for (const householdUpdate of updates.householdUpdates) {
          await client.query(
            'INSERT INTO household_members (user_id, household_id, role, status) VALUES ($1, $2, $3, $4)',
            [id, householdUpdate.householdId, householdUpdate.role, householdUpdate.status]
          );
        }
      }

      logger.debug('User updated in database', { userId: updatedUser.id });
      return updatedUser;
    } catch (error) {
      logger.error('Database error while updating user', { error, id, updates });
      if (error instanceof AppError) throw error;
      if (error instanceof Error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
          throw new AppError('Email already in use', 409);
        }
        if (dbError.code === '22P02') {
          throw new AppError(`Invalid UUID: ${id}`, 400);
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
      logger.debug('Fetching user by auth provider ID', { authProviderId });
      const userResult = await this.db.query(
        `SELECT u.*, 
                COALESCE(json_agg(
                  json_build_object(
                    'id', h.id, 
                    'name', h.name
                  )
                ) FILTER (WHERE h.id IS NOT NULL), '[]') as households
         FROM users u
         LEFT JOIN household_members hm ON u.id = hm.user_id
         LEFT JOIN households h ON hm.household_id = h.id
         WHERE u.auth_provider_id = $1
         GROUP BY u.id`,
        [authProviderId]
      );

      logger.debug('Query result', { rows: userResult.rows.length });

      if (userResult.rows.length === 0) {
        logger.warn('No user found with the given auth provider ID', { authProviderId });
        return null;
      }

      const userData = userResult.rows[0];
      logger.debug('User data retrieved', { userData });

      return new User(
        userData.email,
        userData.name,
        userData.auth_provider_id,
        userData.id,
        userData.households
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
