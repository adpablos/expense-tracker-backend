import { NextFunction, Response } from 'express';
import { inject, injectable } from 'inversify';

import { Household } from '../models/Household';
import { User } from '../models/User';
import { HouseholdService } from '../services/householdService';
import { UserService } from '../services/userService';
import { DI_TYPES } from '../types/di';
import { ExtendedRequest } from '../types/express';
import { AppError } from '../utils/AppError';

@injectable()
export class UserController {
  constructor(
    @inject(DI_TYPES.UserService) private userService: UserService,
    @inject(DI_TYPES.HouseholdService) private householdService: HouseholdService
  ) {}

  public getCurrentUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const updatedUser = await this.userService.getUserByAuthProviderId(req.user.authProviderId);

      if (!updatedUser) {
        throw new AppError('User not found', 404);
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        authProviderId: updatedUser.authProviderId,
        households: updatedUser.households,
      });
    } catch (error) {
      next(error);
    }
  };

  public registerUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, name, auth_provider_id } = req.body;

      if (!email || !name || !auth_provider_id) {
        throw new AppError('Email, name, and auth_provider_id are required', 400);
      }

      const newUser = new User(email, name, auth_provider_id);
      const householdName = `${name}'s Household`;

      const result = await this.userService.createUserWithHousehold(newUser, householdName);

      if (!result || !result.user || !result.household) {
        throw new AppError('Error creating user with household', 500);
      }

      const { user: createdUser, household: createdHousehold } = result;

      res.status(201).json({ user: createdUser, household: createdHousehold });
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, name } = req.body;
      const updatedUser = await this.userService.updateUser(req.user!.id, { email, name });
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  public deleteUser = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      await this.userService.deleteUser(req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getUserHouseholds = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const households = await this.householdService.getUserHouseholds(req.user!.id);
      res.json(households);
    } catch (error) {
      next(error);
    }
  };
}
