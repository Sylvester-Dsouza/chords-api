import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { MultiTrackService } from '../../services/multi-track.service';
import { UploadService } from '../../services/upload.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import {
  MultiTrackUploadDto,
  MultiTrackSongResponseDto,
  MultiTrackListQueryDto,
  MultiTrackAnalyticsDto,
  MultiTrackStatsResponseDto,
  MultiTrackDownloadDto,
  TrackType
} from '../../dto/multi-track.dto';

@ApiTags('Multi-Track')
@Controller('multi-track')
export class MultiTrackController {
  constructor(
    private readonly multiTrackService: MultiTrackService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('songs/:songId/upload')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multi-track URLs for a song (Admin only)' })
  @ApiResponse({ status: 201, description: 'Multi-track URLs saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or song not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async uploadMultiTrack(
    @Param('songId') songId: string,
    @Body() multiTrackData: MultiTrackUploadDto,
  ): Promise<{ message: string; multiTrack?: any }> {
    try {
      // Save multi-track information to database
      const multiTrack = await this.multiTrackService.uploadMultiTrack(songId, multiTrackData);

      return {
        message: 'Multi-track URLs saved successfully',
        multiTrack
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to save multi-track URLs: ${error.message}`);
    }
  }

  @Get('songs')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all multi-track songs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Multi-track songs retrieved successfully', type: [MultiTrackSongResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMultiTrackSongs(@Query() query: MultiTrackListQueryDto): Promise<{
    songs: MultiTrackSongResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.multiTrackService.getMultiTrackSongs(query);
  }

  @Get('songs/:songId')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get multi-track information for a specific song' })
  @ApiResponse({ status: 200, description: 'Multi-track information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Multi-track not found for this song' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMultiTrackBySongId(@Param('songId') songId: string) {
    return await this.multiTrackService.getMultiTrackBySongId(songId);
  }

  @Delete('songs/:songId')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove multi-track from a song (Admin only)' })
  @ApiResponse({ status: 200, description: 'Multi-track removed successfully' })
  @ApiResponse({ status: 404, description: 'Multi-track not found for this song' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async removeMultiTrack(@Param('songId') songId: string): Promise<{ message: string }> {
    return await this.multiTrackService.deleteMultiTrack(songId);
  }

  @Get('songs/:songId/download')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get multi-track download URLs for all tracks' })
  @ApiResponse({ status: 200, description: 'Download URLs retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Multi-track not found for this song' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMultiTrackDownloadUrls(@Param('songId') songId: string): Promise<MultiTrackDownloadDto> {
    return await this.multiTrackService.getMultiTrackDownloadUrls(songId);
  }

  @Get('stats')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get multi-track statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Multi-track statistics retrieved successfully', type: MultiTrackStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getMultiTrackStats(): Promise<MultiTrackStatsResponseDto> {
    return await this.multiTrackService.getMultiTrackStats();
  }

  @Post('analytics')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track multi-track analytics (downloads, plays, etc.)' })
  @ApiResponse({ status: 201, description: 'Analytics tracked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid analytics data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async trackAnalytics(@Body() analyticsData: MultiTrackAnalyticsDto): Promise<{ message: string }> {
    await this.multiTrackService.trackAnalytics(analyticsData);
    return { message: 'Analytics tracked successfully' };
  }


}
