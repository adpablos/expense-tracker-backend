import { Pool } from 'pg';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

export class UserService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
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
                'INSERT INTO users (id, email, name, auth_provider_id, household_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [dbUser.id, dbUser.email, dbUser.name, dbUser.auth_provider_id, dbUser.household_id]
            );
            const createdUser = User.fromDatabase(result.rows[0]);
            logger.info('Created user', { user: createdUser });
            return createdUser;
        } catch (error: any) {
            logger.error('Error creating user', {
                error: error.message,
                stack: error.stack,
                user: user
            });
            if (error.code === '23505') {  // Código de error de PostgreSQL para violación de unicidad
                throw new AppError('User with this email or auth provider ID already exists', 409);
            }
            throw new AppError(`Error creating user: ${error.message}`, 500);
        }
    }

    async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
        logger.info('Fetching user by auth provider ID', { authProviderId });
        try {
            const result = await this.db.query(
                'SELECT * FROM users WHERE auth_provider_id = $1',
                [authProviderId]
            );
            if (result.rows.length === 0) {
                logger.info('User not found', { authProviderId });
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

    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        logger.info('Updating user', { id, updates });
        try {
            const result = await this.db.query(
                'UPDATE users SET email = $1, household_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                [updates.email, updates.householdId, id]
            );
            if (result.rows.length === 0) {
                logger.warn('User not found', { id });
                throw new AppError('User not found', 404);
            }
            const updatedUser = User.fromDatabase(result.rows[0]);
            logger.info('Updated user', { user: updatedUser });
            return updatedUser;
        } catch (error) {
            logger.error('Error updating user', { error: error });
            throw new AppError('Error updating user', 500);
        }
    }

    async deleteUser(id: string): Promise<void> {
        logger.info('Deleting user', { id });
        try {
            const result = await this.db.query('DELETE FROM users WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                logger.warn('User not found', { id });
                throw new AppError('User not found', 404);
            }
            logger.info('Deleted user', { id });
        } catch (error) {
            logger.error('Error deleting user', { error: error });
            throw new AppError('Error deleting user', 500);
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

            // Create household
            const householdResult = await client.query(
                'INSERT INTO households (name) VALUES ($1) RETURNING id',
                [householdName]
            );

            // Update user with household ID
            const updatedUserResult = await client.query(
                'UPDATE users SET household_id = $1 WHERE id = $2 RETURNING *',
                [householdResult.rows[0].id, userResult.rows[0].id]
            );

            await client.query('COMMIT');

            const createdUser = User.fromDatabase(updatedUserResult.rows[0]);
            logger.info('Created user with household', { user: createdUser });
            return createdUser;
        } catch (error: any) {
            await client.query('ROLLBACK');
            logger.error('Error creating user with household', {
                error: error.message,
                stack: error.stack,
                user: user,
                householdName
            });
            if (error.code === '23505') {
                throw new AppError('User with this email or auth provider ID already exists', 409);
            }
            throw new AppError(`Error creating user with household: ${error.message}`, 500);
        } finally {
            client.release();
        }
    }
}