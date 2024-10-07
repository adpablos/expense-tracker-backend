import { injectable, inject } from 'inversify';

import { DI_TYPES } from '../../config/di';
import logger from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { HouseholdService } from '../householdService';

@injectable()
export class NotificationService {
  constructor(@inject(DI_TYPES.HouseholdService) private householdService: HouseholdService) {}

  async sendPushNotification(userId: string, message: string): Promise<void> {
    // TODO: Implementar envío de notificaciones push
    // Aquí implementarías la lógica para enviar notificaciones push
    // Esto podría implicar el uso de un servicio de terceros como Firebase Cloud Messaging
    logger.info(`Sending push notification to user ${userId}: ${message}`);
    // Por ahora, solo registramos el intento de envío
  }

  async notifyHouseholdMembers(
    householdId: string,
    message: string,
    excludeUserId?: string
  ): Promise<void> {
    try {
      const members = await this.householdService.getHouseholdMembers(householdId);
      for (const member of members) {
        if (member.userId !== excludeUserId && member.status === 'active') {
          await this.sendPushNotification(member.userId, message);
        }
      }
    } catch (error) {
      logger.error('Error notifying household members', { error });
      throw new AppError('Error notifying household members', 500);
    }
  }
}
