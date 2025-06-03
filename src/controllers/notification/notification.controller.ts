import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from '../../services/notification.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationResponseDto,
  UpdateNotificationHistoryDto,
  DeviceTokenDto,
} from '../../dto/notification.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, NotificationStatus, NotificationType, NotificationAudience } from '@prisma/client';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {
    console.log('🔔 NotificationController initialized');
  }

  @Post()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'The notification has been created', type: NotificationResponseDto })
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Get()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, description: 'Return all notifications', type: [NotificationResponseDto] })
  @ApiQuery({ name: 'status', enum: NotificationStatus, required: false })
  @ApiQuery({ name: 'type', enum: NotificationType, required: false })
  @ApiQuery({ name: 'audience', enum: NotificationAudience, required: false })
  @ApiQuery({ name: 'customerId', required: false })
  async findAll(
    @Query('status') status?: NotificationStatus,
    @Query('type') type?: NotificationType,
    @Query('audience') audience?: NotificationAudience,
    @Query('customerId') customerId?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.findAll(status, type, audience, customerId);
  }

  @Get(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiResponse({ status: 200, description: 'Return the notification', type: NotificationResponseDto })
  async findOne(@Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a notification' })
  @ApiResponse({ status: 200, description: 'The notification has been updated', type: NotificationResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'The notification has been deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.notificationService.remove(id);
  }

  @Post('process-scheduled')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process scheduled notifications' })
  @ApiResponse({ status: 200, description: 'Scheduled notifications have been processed' })
  async processScheduledNotifications(): Promise<void> {
    return this.notificationService.processScheduledNotifications();
  }

  @Get('customer/history')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification history for the authenticated customer' })
  @ApiResponse({ status: 200, description: 'Return the notification history' })
  async getCustomerNotificationHistory(@Req() req: RequestWithUser): Promise<any[]> {
    return this.notificationService.getCustomerNotificationHistory(req.user.id);
  }

  @Patch('customer/history/:notificationId')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification history status' })
  @ApiResponse({ status: 200, description: 'The notification history has been updated' })
  async updateNotificationHistory(
    @Param('notificationId') notificationId: string,
    @Body() updateNotificationHistoryDto: UpdateNotificationHistoryDto,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.notificationService.updateNotificationHistory(
      notificationId,
      req.user.id,
      updateNotificationHistoryDto,
    );
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to verify notifications controller is working' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  async test(): Promise<any> {
    console.log('🔔 Test endpoint called');
    return { message: 'Notifications controller is working', timestamp: new Date().toISOString() };
  }

  @Post('device-token')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  @ApiResponse({ status: 201, description: 'The device token has been registered' })
  async registerDeviceToken(
    @Body() deviceTokenDto: DeviceTokenDto,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    console.log('🔔 Device token endpoint called:', deviceTokenDto);
    return this.notificationService.registerDeviceToken(req.user.id, deviceTokenDto);
  }

  @Delete('device-token/:token')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister a device token' })
  @ApiResponse({ status: 200, description: 'The device token has been unregistered' })
  async unregisterDeviceToken(@Param('token') token: string): Promise<void> {
    return this.notificationService.unregisterDeviceToken(token);
  }

  @Post('test-notification')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test notification to the authenticated customer' })
  @ApiResponse({ status: 200, description: 'Test notification has been sent' })
  async sendTestNotification(@Req() req: RequestWithUser): Promise<any> {
    // Create a test notification
    return this.notificationService.createNotification({
      title: 'Test Notification',
      body: 'This is a test notification from the API',
      type: NotificationType.GENERAL,
      audience: NotificationAudience.SPECIFIC_USER,
      customerId: req.user.id,
      data: { test: true, timestamp: new Date().toISOString() },
      sendPush: true,
      sendEmail: false,
    });
  }
}
