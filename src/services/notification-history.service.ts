import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { NotificationHistoryResponseDto } from '../dto/notification.dto';

@Injectable()
export class NotificationHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCustomer(customerId: string): Promise<NotificationHistoryResponseDto[]> {
    const notificationHistory = await this.prisma.notificationHistory.findMany({
      where: {
        customerId,
      },
      include: {
        notification: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map the Prisma response to DTO format
    return notificationHistory.map((history) => {
      // Create a properly typed notification object if it exists
      const notificationDto = history.notification ? {
        id: history.notification.id,
        title: history.notification.title,
        body: history.notification.body,
        data: history.notification.data as Record<string, any> | undefined,
        type: history.notification.type,
        audience: history.notification.audience,
        status: history.notification.status,
        customerId: history.notification.customerId ?? undefined,
        sentAt: history.notification.sentAt,
        scheduledAt: history.notification.scheduledAt ?? undefined,
        createdAt: history.notification.createdAt,
        updatedAt: history.notification.updatedAt,
      } : undefined;

      return {
        id: history.id,
        notificationId: history.notificationId,
        customerId: history.customerId,
        status: history.status,
        deliveredAt: history.deliveredAt ?? undefined,
        readAt: history.readAt ?? undefined,
        clickedAt: history.clickedAt ?? undefined,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt,
        notification: notificationDto
      };
    });
  }
}