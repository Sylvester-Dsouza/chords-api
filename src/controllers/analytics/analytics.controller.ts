import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from '../../services/analytics.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';

// Import the DailyMetrics interface
interface DailyMetrics {
  id: string;
  date: Date;
  activeUsers: number;
  newUsers: number;
  totalPageViews: number;
  totalSongViews: number;
  totalArtistViews: number;
  totalCollectionViews: number;
  totalLikes: number;
  totalComments: number;
}

@ApiTags('analytics')
@Controller('admin/analytics')
@UseGuards(UserAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('songs/most-viewed')
  @ApiOperation({ summary: 'Get most viewed songs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year', 'all'] })
  @ApiResponse({ status: 200, description: 'Returns the most viewed songs' })
  async getMostViewedSongs(
    @Query('limit') limit?: number,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getMostViewedSongs(
      limit ? parseInt(limit.toString(), 10) : 10,
      period || 'all',
    );
  }

  @Get('artists/most-viewed')
  @ApiOperation({ summary: 'Get most viewed artists' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year', 'all'] })
  @ApiResponse({ status: 200, description: 'Returns the most viewed artists' })
  async getMostViewedArtists(
    @Query('limit') limit?: number,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getMostViewedArtists(
      limit ? parseInt(limit.toString(), 10) : 10,
      period || 'all',
    );
  }

  @Get('collections/most-viewed')
  @ApiOperation({ summary: 'Get most viewed collections' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year', 'all'] })
  @ApiResponse({ status: 200, description: 'Returns the most viewed collections' })
  async getMostViewedCollections(
    @Query('limit') limit?: number,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getMostViewedCollections(
      limit ? parseInt(limit.toString(), 10) : 10,
      period || 'all',
    );
  }

  @Get('metrics/daily')
  @ApiOperation({ summary: 'Get daily metrics' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Returns daily metrics for the date range' })
  async getDailyMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<DailyMetrics[]> {
    return this.analyticsService.getDailyMetrics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('metrics/user-activity')
  @ApiOperation({ summary: 'Get user activity metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year', 'all'] })
  @ApiResponse({ status: 200, description: 'Returns user activity metrics' })
  async getUserActivityMetrics(
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getUserActivityMetrics(period || 'month');
  }

  @Get('metrics/content-engagement')
  @ApiOperation({ summary: 'Get content engagement metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year', 'all'] })
  @ApiResponse({ status: 200, description: 'Returns content engagement metrics' })
  async getContentEngagementMetrics(
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getContentEngagementMetrics(period || 'month');
  }

  @Post('metrics/update-daily')
  @ApiOperation({ summary: 'Update daily metrics' })
  @ApiResponse({ status: 200, description: 'Updates daily metrics for yesterday' })
  async updateDailyMetrics() {
    await this.analyticsService.updateDailyMetrics();
    return { success: true, message: 'Daily metrics updated' };
  }
}
