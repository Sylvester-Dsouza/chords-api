import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import * as admin from 'firebase-admin';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationResponseDto,
  UpdateNotificationHistoryDto,
  DeviceTokenDto
} from '../dto/notification.dto';
import {
  NotificationType,
  NotificationAudience,
  NotificationStatus,
  NotificationUserStatus,
  Prisma
} from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize Firebase Admin SDK: ${error}`);
      }
    } else {
      this.firebaseApp = admin.app();
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    try {
      // Validate audience and customerId
      if (dto.audience === NotificationAudience.SPECIFIC_USER && !dto.customerId) {
        throw new BadRequestException('Customer ID is required when audience is SPECIFIC_USER');
      }

      // Determine notification status
      const status = dto.schedule ? NotificationStatus.SCHEDULED : NotificationStatus.SENT;

      // Create notification in database
      const notification = await this.prisma.notification.create({
        data: {
          title: dto.title,
          body: dto.body,
          data: dto.data as Prisma.JsonObject,
          type: dto.type || NotificationType.GENERAL,
          audience: dto.audience || NotificationAudience.ALL,
          status,
          customerId: dto.customerId,
          scheduledAt: dto.scheduledAt,
          sentAt: dto.schedule ? undefined : new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If not scheduled, send the notification immediately
      if (!dto.schedule) {
        await this.sendNotification(notification);
      }

      return this.mapNotificationToDto(notification);
    } catch (error: any) {
      this.logger.error(`Failed to create notification: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Get all notifications with optional filtering
   */
  async findAll(
    status?: NotificationStatus,
    type?: NotificationType,
    audience?: NotificationAudience,
    customerId?: string,
  ): Promise<NotificationResponseDto[]> {
    try {
      const where: Prisma.NotificationWhereInput = {};

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      if (audience) {
        where.audience = audience;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      const notifications = await this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return notifications.map(notification => this.mapNotificationToDto(notification));
    } catch (error: any) {
      this.logger.error(`Failed to get notifications: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Get a notification by ID
   */
  async findOne(id: string): Promise<NotificationResponseDto> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      return this.mapNotificationToDto(notification);
    } catch (error: any) {
      this.logger.error(`Failed to get notification: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Update a notification
   */
  async update(id: string, dto: UpdateNotificationDto): Promise<NotificationResponseDto> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      // Don't allow updating sent notifications
      if (notification.status === NotificationStatus.SENT) {
        throw new BadRequestException('Cannot update a notification that has already been sent');
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id },
        data: {
          title: dto.title,
          body: dto.body,
          data: dto.data as Prisma.JsonObject,
          type: dto.type,
          status: dto.status,
          scheduledAt: dto.scheduledAt,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return this.mapNotificationToDto(updatedNotification);
    } catch (error: any) {
      this.logger.error(`Failed to update notification: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async remove(id: string): Promise<void> {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      await this.prisma.notification.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(`Failed to delete notification: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Send a notification to its target audience
   */
  private async sendNotification(notification: {
    id: string;
    title: string;
    body: string;
    data?: any;
    audience: NotificationAudience;
    customerId?: string | null;
    status: NotificationStatus;
  }): Promise<void> {
    try {
      let deviceTokens: string[] = [];

      // Get device tokens based on audience
      switch (notification.audience) {
        case NotificationAudience.ALL:
          deviceTokens = await this.getAllActiveDeviceTokens();
          break;
        case NotificationAudience.PREMIUM_USERS:
          deviceTokens = await this.getPremiumUserDeviceTokens();
          break;
        case NotificationAudience.FREE_USERS:
          deviceTokens = await this.getFreeUserDeviceTokens();
          break;
        case NotificationAudience.SPECIFIC_USER:
          if (notification.customerId) {
            deviceTokens = await this.getUserDeviceTokens(notification.customerId);
          }
          break;
      }

      if (deviceTokens.length === 0) {
        this.logger.warn(`No device tokens found for notification ${notification.id}`);
        return;
      }

      // Prepare notification message
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          // Always include title and body in data payload for data-only messages
          title: notification.title,
          body: notification.body,
          notificationId: notification.id,
          // Add any additional data
          ...(notification.data ? this.convertJsonToStringMap(notification.data) : {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
              badge: 1,
              alert: {
                title: notification.title,
                body: notification.body,
              },
            },
          },
          headers: {
            'apns-priority': '10',
          },
        },
      };

      // Send the notification
      if (!this.firebaseApp) {
        throw new Error('Firebase app not initialized');
      }
      // Using sendEachForMulticast instead of deprecated sendMulticast
      const response = await this.firebaseApp.messaging().sendEachForMulticast(message);
      this.logger.log(`Notification sent to ${response.successCount} devices`);

      // Create notification history entries for each recipient
      if (notification.audience === NotificationAudience.SPECIFIC_USER && notification.customerId) {
        await this.createNotificationHistory(notification.id, notification.customerId);
      } else {
        // For broadcast notifications, create history entries for all recipients
        const customerIds = await this.getCustomerIdsByAudience(notification.audience);
        for (const customerId of customerIds) {
          await this.createNotificationHistory(notification.id, customerId);
        }
      }

      // Update notification status
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message || error}`);

      // Update notification status to FAILED
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
        },
      });
    }
  }

  /**
   * Create a notification history entry
   */
  private async createNotificationHistory(notificationId: string, customerId: string): Promise<void> {
    try {
      await this.prisma.notificationHistory.create({
        data: {
          notificationId,
          customerId,
          status: NotificationUserStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to create notification history: ${error.message || error}`);
    }
  }

  /**
   * Update notification history status
   */
  async updateNotificationHistory(
    notificationId: string,
    customerId: string,
    dto: UpdateNotificationHistoryDto,
  ): Promise<void> {
    try {
      const history = await this.prisma.notificationHistory.findUnique({
        where: {
          notificationId_customerId: {
            notificationId,
            customerId,
          },
        },
      });

      if (!history) {
        throw new NotFoundException(`Notification history not found for notification ${notificationId} and customer ${customerId}`);
      }

      await this.prisma.notificationHistory.update({
        where: {
          notificationId_customerId: {
            notificationId,
            customerId,
          },
        },
        data: {
          status: dto.status,
          readAt: dto.status === NotificationUserStatus.READ ? new Date() : dto.readAt,
          clickedAt: dto.status === NotificationUserStatus.CLICKED ? new Date() : dto.clickedAt,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to update notification history: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Get notification history for a customer
   */
  async getCustomerNotificationHistory(customerId: string): Promise<any[]> {
    try {
      const history = await this.prisma.notificationHistory.findMany({
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

      return history;
    } catch (error: any) {
      this.logger.error(`Failed to get customer notification history: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(customerId: string, dto: DeviceTokenDto): Promise<any> {
    try {
      // Check if token already exists
      const existingToken = await this.prisma.deviceToken.findUnique({
        where: { token: dto.token },
      });

      if (existingToken) {
        // Update existing token
        return await this.prisma.deviceToken.update({
          where: { token: dto.token },
          data: {
            customerId,
            deviceType: dto.deviceType,
            deviceName: dto.deviceName,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });
      }

      // Create new token
      return await this.prisma.deviceToken.create({
        data: {
          token: dto.token,
          customerId,
          deviceType: dto.deviceType,
          deviceName: dto.deviceName,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to register device token: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.update({
        where: { token },
        data: {
          isActive: false,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to unregister device token: ${error.message || error}`);
      throw error;
    }
  }

  /**
   * Get all active device tokens
   */
  private async getAllActiveDeviceTokens(): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        isActive: true,
      },
      select: {
        token: true,
      },
    });

    return tokens.map((t: { token: string }) => t.token);
  }

  /**
   * Get device tokens for premium users
   */
  private async getPremiumUserDeviceTokens(): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        isActive: true,
        customer: {
          subscriptionType: {
            in: ['PREMIUM', 'PRO'],
          },
        },
      },
      select: {
        token: true,
      },
    });

    return tokens.map((t: { token: string }) => t.token);
  }

  /**
   * Get device tokens for free users
   */
  private async getFreeUserDeviceTokens(): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        isActive: true,
        customer: {
          subscriptionType: 'FREE',
        },
      },
      select: {
        token: true,
      },
    });

    return tokens.map((t: { token: string }) => t.token);
  }

  /**
   * Get device tokens for a specific user
   */
  private async getUserDeviceTokens(customerId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        customerId,
        isActive: true,
      },
      select: {
        token: true,
      },
    });

    return tokens.map((t: { token: string }) => t.token);
  }

  /**
   * Get customer IDs by audience type
   */
  private async getCustomerIdsByAudience(audience: NotificationAudience): Promise<string[]> {
    let customers: Array<{id: string}> = [];

    switch (audience) {
      case NotificationAudience.ALL:
        customers = await this.prisma.customer.findMany({
          select: { id: true },
        });
        break;
      case NotificationAudience.PREMIUM_USERS:
        customers = await this.prisma.customer.findMany({
          where: {
            subscriptionType: {
              in: ['PREMIUM', 'PRO'],
            },
          },
          select: { id: true },
        });
        break;
      case NotificationAudience.FREE_USERS:
        customers = await this.prisma.customer.findMany({
          where: {
            subscriptionType: 'FREE',
          },
          select: { id: true },
        });
        break;
      default:
        customers = [];
    }

    return customers.map(c => c.id);
  }

  /**
   * Convert JSON object to string map for FCM
   */
  private convertJsonToStringMap(json: any): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(json)) {
      result[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    return result;
  }

  /**
   * Map Prisma Notification model to DTO
   */
  private mapNotificationToDto(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      type: notification.type,
      audience: notification.audience,
      status: notification.status,
      customerId: notification.customerId,
      sentAt: notification.sentAt,
      scheduledAt: notification.scheduledAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      customer: notification.customer,
    };
  }

  /**
   * Process scheduled notifications
   * This method should be called by a cron job
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();

      // Find scheduled notifications that are due
      const scheduledNotifications = await this.prisma.notification.findMany({
        where: {
          status: NotificationStatus.SCHEDULED,
          scheduledAt: {
            lte: now,
          },
        },
      });

      this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

      // Send each notification
      for (const notification of scheduledNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process scheduled notifications: ${error.message || error}`);
    }
  }

  /**
   * Send a notification when a song request is completed
   */
  async sendSongRequestCompletedNotification(
    email: string,
    name: string,
    songName: string,
  ): Promise<void> {
    try {
      // Log the notification for debugging
      this.logger.log(
        `Notification sent to ${name} (${email}): Your song request for "${songName}" has been completed!`,
      );

      // Find the customer by email
      const customer = await this.prisma.customer.findUnique({
        where: { email },
      });

      if (!customer) {
        this.logger.warn(`Customer with email ${email} not found`);
        return;
      }

      // Create notification
      await this.createNotification({
        title: 'Song Request Completed',
        body: `Your song request for "${songName}" has been completed!`,
        type: NotificationType.SONG_REQUEST_COMPLETED,
        audience: NotificationAudience.SPECIFIC_USER,
        customerId: customer.id,
        data: { songName },
        sendPush: true,
        sendEmail: false,
      });
    } catch (error: any) {
      this.logger.error(`Failed to send song request completed notification: ${error.message || error}`);
    }
  }

  /**
   * Send a notification when a requested song is added
   */
  async sendSongAddedNotification(
    email: string,
    name: string,
    songName: string,
    songId: string,
  ): Promise<void> {
    try {
      // Log the notification for debugging
      this.logger.log(
        `Notification sent to ${name} (${email}): The song "${songName}" you requested has been added! Song ID: ${songId}`,
      );

      // Find the customer by email
      const customer = await this.prisma.customer.findUnique({
        where: { email },
      });

      if (!customer) {
        this.logger.warn(`Customer with email ${email} not found`);
        return;
      }

      // Create notification
      await this.createNotification({
        title: 'Song Added',
        body: `The song "${songName}" you requested has been added!`,
        type: NotificationType.SONG_ADDED,
        audience: NotificationAudience.SPECIFIC_USER,
        customerId: customer.id,
        data: { songId, songName },
        sendPush: true,
        sendEmail: false,
      });
    } catch (error: any) {
      this.logger.error(`Failed to send song added notification: ${error.message || error}`);
    }
  }
}
