import {NextFunction, Request, Response} from 'express';
import {inject, injectable} from 'inversify';
import {HouseholdService} from '../services/householdService';
import {UserService} from '../services/userService';
import {NotificationService} from '../services/external/notificationService';
import {Household} from '../models/Household';
import logger from '../config/logger';
import {AppError} from "../utils/AppError";
import {User} from "../models/User";
import {TYPES} from '../types';

@injectable()
export class HouseholdController {
    constructor(
        @inject(TYPES.HouseholdService) private householdService: HouseholdService,
        @inject(TYPES.UserService) private userService: UserService,
        @inject(TYPES.NotificationService) private notificationService: NotificationService
    ) {}

    public createHousehold = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {name} = req.body;

            if (!req.user) {
                throw new AppError('User not authenticated', 401);
            }

            const user = req.user as User;

            const newHousehold = new Household(name);
            const createdHousehold = await this.householdService.createHousehold(newHousehold, user);

            user.addHousehold(createdHousehold.id);

            res.status(201).json(createdHousehold);
        } catch (error) {
            next(error);
        }
    };

    public inviteMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {householdId} = req.params;
            const {invitedUserId} = req.body;
            await this.householdService.inviteMember(householdId, invitedUserId, req.user!.id);
            res.status(200).json({message: 'Invitation sent successfully'});
        } catch (error) {
            next(error);
        }
    };

    public acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {householdId} = req.params;
            await this.householdService.acceptInvitation(householdId, req.user!.id);
            res.status(200).json({message: 'Invitation accepted successfully'});
        } catch (error) {
            next(error);
        }
    };

    public rejectInvitation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {householdId} = req.params;
            await this.householdService.rejectInvitation(householdId, req.user!.id);
            res.status(200).json({message: 'Invitation rejected successfully'});
        } catch (error) {
            next(error);
        }
    };

    public getHouseholdMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {householdId} = req.params;
            const members = await this.householdService.getHouseholdMembers(householdId);
            res.status(200).json(members);
        } catch (error) {
            next(error);
        }
    };

    public removeMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {householdId, userId} = req.params;
            await this.householdService.removeMember(householdId, userId, req.user!.id);
            res.status(200).json({message: 'Member removed successfully'});
        } catch (error) {
            next(error);
        }
    };
}