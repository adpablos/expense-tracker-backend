import 'reflect-metadata';

import logger from '../../../../src/config/logger';
import { HouseholdMember } from '../../../../src/models/HouseholdMember';
import { NotificationService } from '../../../../src/services/external/notificationService';
import { HouseholdService } from '../../../../src/services/householdService';

jest.mock('../../../../src/services/householdService');
jest.mock('../../../../src/config/logger');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockHouseholdService: jest.Mocked<HouseholdService>;

  beforeEach(() => {
    mockHouseholdService = {
      getHouseholdMembers: jest.fn(),
    } as unknown as jest.Mocked<HouseholdService>;
    notificationService = new NotificationService(mockHouseholdService);
  });

  describe('sendPushNotification', () => {
    it('should log the notification attempt', async () => {
      await notificationService.sendPushNotification('user1', 'Test message');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sending push notification')
      );
    });
  });

  describe('notifyHouseholdMembers', () => {
    it('should notify all active household members except excluded user', async () => {
      const mockMembers: HouseholdMember[] = [
        {
          id: '1',
          userId: 'user1',
          householdId: 'household1',
          status: 'active',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
          toDatabase: jest.fn(),
          validate: jest.fn(),
        },
        {
          id: '2',
          userId: 'user2',
          householdId: 'household1',
          status: 'active',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
          toDatabase: jest.fn(),
          validate: jest.fn(),
        },
        {
          id: '3',
          userId: 'user3',
          householdId: 'household1',
          status: 'removed',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
          toDatabase: jest.fn(),
          validate: jest.fn(),
        },
      ];
      mockHouseholdService.getHouseholdMembers.mockResolvedValue(mockMembers);

      const sendPushNotificationSpy = jest
        .spyOn(notificationService, 'sendPushNotification')
        .mockResolvedValue();

      await notificationService.notifyHouseholdMembers('household1', 'Test message', 'user1');

      expect(sendPushNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendPushNotificationSpy).toHaveBeenCalledWith('user2', 'Test message');
    });

    it('should throw an error if there is a problem notifying members', async () => {
      mockHouseholdService.getHouseholdMembers.mockRejectedValue(new Error('Database error'));

      await expect(
        notificationService.notifyHouseholdMembers('household1', 'Test message')
      ).rejects.toThrow('Error notifying household members');
    });
  });
});
