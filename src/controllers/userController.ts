import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import logger from '../config/logger';
import pool from '../config/db';
import {User} from "../models/User";

const userService = new UserService(pool);

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        res.json(user);
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

        const createdUser = await userService.createUserWithHousehold(newUser, householdName);

        res.status(201).json(createdUser);
    } catch (error) {
        logger.error('Error registering user', { error });
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, householdId } = req.body;
        const updatedUser = await userService.updateUser(req.user!.id, { email, householdId });
        res.json(updatedUser);
    } catch (error) {
        logger.error('Error updating user', { error });
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