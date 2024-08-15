import { Request, Response, NextFunction } from 'express';
import { HouseholdService } from '../services/householdService';
import { Household } from '../models/Household';
import logger from '../config/logger';
import pool from '../config/db';

const householdService = new HouseholdService(pool);

export const createHousehold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body;
        const newHousehold = new Household(name);
        const createdHousehold = await householdService.createHousehold(newHousehold, req.user!.id);
        res.status(201).json(createdHousehold);
    } catch (error) {
        logger.error('Error creating household', { error });
        next(error);
    }
};

export const inviteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { householdId } = req.params;
        const { invitedUserId } = req.body;
        await householdService.inviteMember(householdId, invitedUserId, req.user!.id);
        res.status(200).json({ message: 'Invitation sent successfully' });
    } catch (error) {
        logger.error('Error inviting member', { error });
        next(error);
    }
};

export const acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { householdId } = req.params;
        await householdService.acceptInvitation(householdId, req.user!.id);
        res.status(200).json({ message: 'Invitation accepted successfully' });
    } catch (error) {
        logger.error('Error accepting invitation', { error });
        next(error);
    }
};

export const rejectInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { householdId } = req.params;
        await householdService.rejectInvitation(householdId, req.user!.id);
        res.status(200).json({ message: 'Invitation rejected successfully' });
    } catch (error) {
        logger.error('Error rejecting invitation', { error });
        next(error);
    }
};

export const getHouseholdMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { householdId } = req.params;
        const members = await householdService.getHouseholdMembers(householdId);
        res.status(200).json(members);
    } catch (error) {
        logger.error('Error getting household members', { error });
        next(error);
    }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { householdId, userId } = req.params;
        await householdService.removeMember(householdId, userId, req.user!.id);
        res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
        logger.error('Error removing member', { error });
        next(error);
    }
};