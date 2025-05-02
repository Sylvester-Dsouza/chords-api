import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean, IsDate, IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationAudience, NotificationStatus, NotificationUserStatus } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title', example: 'New Feature Available' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Notification body', example: 'We\'ve added a new feature to transpose chords!' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification (JSON)', example: { featureId: '123', url: '/features/transpose' } })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.NEW_FEATURE,
    default: NotificationType.GENERAL
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({
    enum: NotificationAudience,
    description: 'Target audience for the notification',
    example: NotificationAudience.ALL,
    default: NotificationAudience.ALL
  })
  @IsEnum(NotificationAudience)
  @IsOptional()
  audience?: NotificationAudience;

  @ApiPropertyOptional({ description: 'Specific customer ID (required if audience is SPECIFIC_USER)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Whether to schedule the notification for later', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  schedule?: boolean;

  @ApiPropertyOptional({ description: 'When to send the notification (if scheduled)', example: '2023-12-25T10:00:00Z' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Whether to send as push notification', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  sendPush?: boolean;

  @ApiPropertyOptional({ description: 'Whether to send as email', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;

  @ApiPropertyOptional({ description: 'Specific device tokens to target (if empty, sends to all devices of target users)', type: [String] })
  @IsArray()
  @IsOptional()
  deviceTokens?: string[];
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Notification title', example: 'New Feature Available' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Notification body', example: 'We\'ve added a new feature to transpose chords!' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification (JSON)', example: { featureId: '123', url: '/features/transpose' } })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.NEW_FEATURE
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    enum: NotificationStatus,
    description: 'Status of the notification',
    example: NotificationStatus.SCHEDULED
  })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'When to send the notification (if scheduled)', example: '2023-12-25T10:00:00Z' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledAt?: Date;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id!: string;

  @ApiProperty({ description: 'Notification title', example: 'New Feature Available' })
  title!: string;

  @ApiProperty({ description: 'Notification body', example: 'We\'ve added a new feature to transpose chords!' })
  body!: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification (JSON)', example: { featureId: '123', url: '/features/transpose' } })
  data?: Record<string, any>;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationAudience, description: 'Target audience for the notification' })
  audience!: NotificationAudience;

  @ApiProperty({ enum: NotificationStatus, description: 'Status of the notification' })
  status!: NotificationStatus;

  @ApiPropertyOptional({ description: 'Specific customer ID (if audience is SPECIFIC_USER)' })
  customerId?: string;

  @ApiProperty({ description: 'When the notification was sent' })
  sentAt!: Date;

  @ApiPropertyOptional({ description: 'When the notification is scheduled to be sent' })
  scheduledAt?: Date;

  @ApiProperty({ description: 'When the notification was created' })
  createdAt!: Date;

  @ApiProperty({ description: 'When the notification was last updated' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Customer information (if audience is SPECIFIC_USER)' })
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

export class NotificationHistoryResponseDto {
  @ApiProperty({ description: 'Notification history ID' })
  id!: string;

  @ApiProperty({ description: 'Notification ID' })
  notificationId!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ enum: NotificationUserStatus, description: 'Status of the notification for this user' })
  status!: NotificationUserStatus;

  @ApiPropertyOptional({ description: 'When the notification was delivered to the user' })
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: 'When the notification was read by the user' })
  readAt?: Date;

  @ApiPropertyOptional({ description: 'When the notification was clicked by the user' })
  clickedAt?: Date;

  @ApiProperty({ description: 'When the notification history was created' })
  createdAt!: Date;

  @ApiProperty({ description: 'When the notification history was last updated' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Notification details' })
  notification?: NotificationResponseDto;

  @ApiPropertyOptional({ description: 'Customer information' })
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

export class UpdateNotificationHistoryDto {
  @ApiProperty({ enum: NotificationUserStatus, description: 'Status of the notification for this user' })
  @IsEnum(NotificationUserStatus)
  status!: NotificationUserStatus;

  @ApiPropertyOptional({ description: 'When the notification was read by the user' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  readAt?: Date;

  @ApiPropertyOptional({ description: 'When the notification was clicked by the user' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  clickedAt?: Date;
}

export class DeviceTokenDto {
  @ApiProperty({ description: 'FCM device token', example: 'fMqQMH2PCEg:APA91bHZY...' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Device type', example: 'android', enum: ['android', 'ios', 'web'] })
  @IsString()
  deviceType!: string;

  @ApiPropertyOptional({ description: 'Device name', example: 'Google Pixel 6' })
  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class DeviceTokenResponseDto {
  @ApiProperty({ description: 'Device token ID' })
  id!: string;

  @ApiProperty({ description: 'FCM device token' })
  token!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Device type', example: 'android' })
  deviceType!: string;

  @ApiPropertyOptional({ description: 'Device name', example: 'Google Pixel 6' })
  deviceName?: string;

  @ApiProperty({ description: 'Whether the token is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'When the token was last used' })
  lastUsedAt!: Date;

  @ApiProperty({ description: 'When the token was created' })
  createdAt!: Date;

  @ApiProperty({ description: 'When the token was last updated' })
  updatedAt!: Date;
}
