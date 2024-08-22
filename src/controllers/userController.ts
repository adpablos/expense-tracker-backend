import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import logger from '../config/logger';
import pool from '../config/db';
import { User } from '../models/User';
import { HouseholdService } from '../services/householdService';
import {Household} from "../models/Household";
import {AppError} from "../utils/AppError";

const userService = new UserService(pool);
const householdService = new HouseholdService(pool);

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('User not authenticated', 401);
        }

        const updatedUser = await userService.getUserByAuthProviderId(req.user.authProviderId);

        if (!updatedUser) {
            throw new AppError('User not found', 404);
        }

        res.json({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            authProviderId: updatedUser.authProviderId,
            households: updatedUser.households
        });
    } catch (error) {
        logger.error('Error fetching current user', { error });
        next(error);
    }
};

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, auth_provider_id } = req.body;

        if (!email || !name || !auth_provider_id) {
            return res.status(400).json({ message: 'Email, name, and auth_provider_id are required' });
        }

        const newUser = new User(email, name, auth_provider_id);
        const householdName = `${name}'s Household`;
        const newHousehold = new Household(householdName);

        const createdHousehold = await householdService.createHousehold(newHousehold, newUser);

        newUser.addHousehold(createdHousehold.id);

        res.status(201).json({ user: newUser, household: createdHousehold });
    } catch (error: any) {
        logger.error('Error registering user', { error });
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message });
        }
        if (error.code === '23505') {
            return res.status(409).json({ status: 'error', message: 'Duplicate entry: User or Household already exists' });
        }
        res.status(500).json({ status: 'error', message: 'An unexpected error occurred while registering the user' });
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name } = req.body;
        const updatedUser = await userService.updateUser(req.user!.id, { email, name });
        res.json(updatedUser);
    } catch (error: any) {
        logger.error('Error updating user', { error });
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Email already in use' });
        }
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await userService.deleteUser(req.user!.id);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting user', { error });
        next(error);
    }
};

export const getUserHouseholds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const households = await householdService.getUserHouseholds(req.user!.id);
        res.json(households);
    } catch (error) {
        logger.error('Error fetching user households', { error });
        next(error);
    }
};