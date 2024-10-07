import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';

import logger from '../config/logger';
import { Household } from '../models/Household';
import { User } from '../models/User';
import { NotificationService } from '../services/external/notificationService';
import { HouseholdService } from '../services/householdService';
import { UserService } from '../services/userService';
import { DI_TYPES } from '../config/di';
import { AppError } from '../utils/AppError';

@injectable()
export class HouseholdController {
  constructor(
    @inject(DI_TYPES.HouseholdService) private householdService: HouseholdService,
    @inject(DI_TYPES.UserService) private userService: UserService,
    @inject(DI_TYPES.NotificationService) private notificationService: NotificationService
  ) {}

  public createHousehold = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body;

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const user = req.user instanceof User ? req.user : User.fromDatabase(req.user);

      const newHousehold = new Household(name);
      const createdHousehold = await this.householdService.createHousehold(newHousehold, user);

      user.addHousehold(createdHousehold.id);
      await this.userService.updateUser(user.id, { households: user.households });

      res.status(201).json(createdHousehold);
    } catch (error) {
      next(error);
    }
  };

  public inviteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { householdId } = req.params;
      const { invitedUserId } = req.body;
      await this.householdService.inviteMember(householdId, invitedUserId, req.user!.id);
      res.status(200).json({ message: 'Invitation sent successfully' });
    } catch (error) {
      next(error);
    }
  };

  public acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { householdId } = req.params;
      await this.householdService.acceptInvitation(householdId, req.user!.id);
      res.status(200).json({ message: 'Invitation accepted successfully' });
    } catch (error) {
      next(error);
    }
  };

  public rejectInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { householdId } = req.params;
      await this.householdService.rejectInvitation(householdId, req.user!.id);
      res.status(200).json({ message: 'Invitation rejected successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getHouseholdMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { householdId } = req.params;
      const members = await this.householdService.getHouseholdMembers(householdId);
      res.status(200).json(members);
    } catch (error) {
      next(error);
    }
  };

  public removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { householdId, userId } = req.params;
      await this.householdService.removeMember(householdId, userId, req.user!.id);
      res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getUserHouseholds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug('getUserHouseholds called', { userId: req.user?.id });
      if (!req.user) {
        logger.warn('User not authenticated in getUserHouseholds');
        throw new AppError('User not authenticated', 401);
      }

      const households = await this.householdService.getUserHouseholds(req.user.id);
      logger.debug('Households fetched from service', { count: households.length });

      res.json(households);
    } catch (error) {
      logger.error('Error in getUserHouseholds', { error });
      next(error);
    }
  };
}
