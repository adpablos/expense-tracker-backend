import { Pool } from 'pg';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

export class HouseholdService {
    private db: Pool;

    constructor(db: Pool) {
        this.db = db;
    }

    async createHousehold(household: Household, userId: string): Promise<Household> {
        logger.info('Creating household', { name: household.name });

        const errors = household.validate();
        if (errors.length > 0) {
            logger.warn('Invalid household data', { errors });
            throw new AppError(`Invalid household: ${errors.join(', ')}`, 400);
        }

        try {
            await this.db.query('BEGIN');

            const dbHousehold = household.toDatabase();
            const result = await this.db.query(
                'INSERT INTO households (id, name) VALUES ($1, $2) RETURNING *',
                [dbHousehold.id, dbHousehold.name]
            );
            const createdHousehold = Household.fromDatabase(result.rows[0]);

            const householdMember = new HouseholdMember(createdHousehold.id, userId, 'owner', 'active');
            await this.db.query(
                'INSERT INTO household_members (id, household_id, user_id, role, status) VALUES ($1, $2, $3, $4, $5)',
                [householdMember.id, householdMember.householdId, householdMember.userId, householdMember.role, householdMember.status]
            );

            await this.db.query('COMMIT');

            logger.info('Created household', { household: createdHousehold });
            return createdHousehold;
        } catch (error) {
            await this.db.query('ROLLBACK');
            logger.error('Error creating household', { error: error });
            throw new AppError('Error creating household', 500);
        }
    }

    async getHouseholdById(id: string): Promise<Household | null> {
        logger.info('Fetching household by ID', { id });
        try {
            const result = await this.db.query('SELECT * FROM households WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                logger.info('Household not found', { id });
                return null;
            }
            const household = Household.fromDatabase(result.rows[0]);
            logger.info('Fetched household', { household });
            return household;
        } catch (error) {
            logger.error('Error fetching household', { error: error });
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
                [householdMember.id, householdMember.householdId, householdMember.userId, householdMember.role, householdMember.status]
            );

            logger.info('Invited member to household', { householdId, invitedUserId });
        } catch (error) {
            logger.error('Error inviting member to household', { error: error });
            throw error instanceof AppError ? error : new AppError('Error inviting member to household', 500);
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
            throw error instanceof AppError ? error : new AppError('Error accepting household invitation', 500);
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
            throw error instanceof AppError ? error : new AppError('Error rejecting household invitation', 500);
        }
    }

    async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM household_members WHERE household_id = $1',
                [householdId]
            );
            return result.rows.map(HouseholdMember.fromDatabase);
        } catch (error) {
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
            throw error instanceof AppError ? error : new AppError('Error removing member from household', 500);
        }
    }
}