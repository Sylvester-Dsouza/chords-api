import { Controller, Post, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { RequestWithUser } from '../../interfaces/request-with-user.interface';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from '../../services/analytics.service';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Public } from '../../decorators/public.decorator';

@ApiTags('analytics-tracking')
@Controller('analytics')
export class TrackingController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track/view')
  @Public()
  @ApiOperation({ summary: 'Track a content view' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        contentType: { type: 'string', enum: ['song', 'artist', 'collection'] },
        contentId: { type: 'string' },
        sessionId: { type: 'string' },
        source: { type: 'string' },
      },
      required: ['contentType', 'contentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Content view tracked' })
  async trackContentView(
    @Body() body: { contentType: string; contentId: string; sessionId?: string; source?: string },
    @Req() req: RequestWithUser,
    // We're not using userAgent here, but it's available if needed in the future
    @Headers('user-agent') _userAgent: string,
  ) {
    const customerId = req.user?.id;

    await this.analyticsService.trackContentView(
      body.contentType,
      body.contentId,
      customerId,
      body.sessionId,
      body.source,
    );

    return { success: true };
  }

  @Post('track/page')
  @Public()
  @ApiOperation({ summary: 'Track a page view' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        page: { type: 'string' },
        sessionId: { type: 'string' },
        referrer: { type: 'string' },
        parameters: { type: 'object' },
      },
      required: ['page', 'sessionId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Page view tracked' })
  async trackPageView(
    @Body() body: { page: string; sessionId: string; referrer?: string; parameters?: any },
    @Req() req: RequestWithUser,
  ) {
    const customerId = req.user?.id;

    await this.analyticsService.trackPageView(
      body.page,
      body.sessionId,
      customerId,
      body.referrer,
      body.parameters,
    );

    return { success: true };
  }

  @Post('session/start')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Start a new session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceInfo: { type: 'string' },
        appVersion: { type: 'string' },
        platform: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Session started' })
  async startSession(
    @Body() body: { deviceInfo?: string; appVersion?: string; platform?: string },
    @Req() req: RequestWithUser,
    @Headers('user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
  ) {
    // User is guaranteed to exist because of CustomerAuthGuard
    const customerId = req.user!.id;
    const ipAddress = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';

    const sessionId = await this.analyticsService.createOrUpdateSession(
      customerId,
      body.deviceInfo,
      ipAddress,
      userAgent,
      body.appVersion,
      body.platform,
    );

    return { sessionId };
  }

  @Post('session/end')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'End a session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
      required: ['sessionId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async endSession(
    @Body() body: { sessionId: string },
  ) {
    await this.analyticsService.endSession(body.sessionId);
    return { success: true };
  }
}
