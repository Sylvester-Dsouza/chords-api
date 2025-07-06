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
import { KaraokeService } from '../../services/karaoke.service';
import { UploadService } from '../../services/upload.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import {
  KaraokeUploadDto,
  KaraokeSongResponseDto,
  KaraokeListQueryDto,
  KaraokeAnalyticsDto,
  KaraokeStatsResponseDto,
  MultiTrackKaraokeUploadDto,
  KaraokeTrackDownloadDto,
  TrackType,
} from '../../dto/karaoke.dto';

@ApiTags('Karaoke')
@Controller('karaoke')
export class KaraokeController {
  constructor(
    private readonly karaokeService: KaraokeService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('songs/:songId/upload')
  @UseGuards(UserAuthGuard)
  @UseInterceptors(FileInterceptor('karaokeFile'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload karaoke file for a song (Admin only)' })
  @ApiResponse({ status: 201, description: 'Karaoke file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or song not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async uploadKaraoke(
    @Param('songId') songId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() karaokeData: KaraokeUploadDto,
  ): Promise<{ message: string; karaoke?: any }> {
    if (!file) {
      throw new BadRequestException('Karaoke file is required');
    }

    // Validate file type
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only MP3, WAV, and M4A files are allowed');
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 50MB');
    }

    try {
      // Upload file to Supabase Storage using existing UploadService
      const fileUrl = await this.uploadService.uploadFile(
        file.buffer,
        'karaoke', // folder
        file.originalname,
        file.mimetype,
        songId, // entityId to create subfolder
      );

      if (!fileUrl) {
        throw new BadRequestException('Failed to upload karaoke file to storage');
      }

      // Save karaoke information to database
      const karaoke = await this.karaokeService.uploadKaraoke(songId, karaokeData, fileUrl, file.size);

      return {
        message: 'Karaoke file uploaded successfully',
        karaoke
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to upload karaoke file: ${error.message}`);
    }
  }

  @Delete('songs/:songId')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove karaoke from a song (Admin only)' })
  @ApiResponse({ status: 200, description: 'Karaoke removed successfully' })
  @ApiResponse({ status: 400, description: 'Song not found or no karaoke available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async removeKaraoke(@Param('songId') songId: string): Promise<{ message: string }> {
    await this.karaokeService.removeKaraoke(songId);
    return { message: 'Karaoke removed successfully' };
  }

  @Get('songs/:songId/download')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get karaoke download URL for a song' })
  @ApiResponse({ status: 200, description: 'Karaoke download URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Song not found or no karaoke available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getKaraokeDownloadUrl(
    @Param('songId') songId: string,
  ): Promise<{ downloadUrl: string; fileSize: number; duration: number }> {
    return this.karaokeService.getKaraokeDownloadUrl(songId);
  }

  @Get('songs')
  @ApiOperation({ summary: 'Get list of all karaoke songs' })
  @ApiResponse({ status: 200, description: 'Karaoke songs retrieved successfully', type: [KaraokeSongResponseDto] })
  async getKaraokeSongs(
    @Query() query: KaraokeListQueryDto,
  ): Promise<{ songs: KaraokeSongResponseDto[]; total: number; page: number; limit: number }> {
    return this.karaokeService.getKaraokeSongs(query);
  }

  @Get('songs/popular')
  @ApiOperation({ summary: 'Get popular karaoke songs' })
  @ApiResponse({ status: 200, description: 'Popular karaoke songs retrieved successfully', type: [KaraokeSongResponseDto] })
  async getPopularKaraokeSongs(
    @Query('limit') limit: number = 10,
  ): Promise<{ songs: KaraokeSongResponseDto[] }> {
    const result = await this.karaokeService.getKaraokeSongs({
      sort: 'popular',
      limit,
      page: 1,
    });
    return { songs: result.songs };
  }

  @Get('songs/recent')
  @ApiOperation({ summary: 'Get recently added karaoke songs' })
  @ApiResponse({ status: 200, description: 'Recent karaoke songs retrieved successfully', type: [KaraokeSongResponseDto] })
  async getRecentKaraokeSongs(
    @Query('limit') limit: number = 10,
  ): Promise<{ songs: KaraokeSongResponseDto[] }> {
    const result = await this.karaokeService.getKaraokeSongs({
      sort: 'recent',
      limit,
      page: 1,
    });
    return { songs: result.songs };
  }

  @Post('analytics')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track karaoke analytics' })
  @ApiResponse({ status: 201, description: 'Analytics tracked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async trackAnalytics(@Body() analyticsData: KaraokeAnalyticsDto): Promise<{ message: string }> {
    await this.karaokeService.trackAnalytics(analyticsData);
    return { message: 'Analytics tracked successfully' };
  }

  @Get('stats')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get karaoke statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Karaoke statistics retrieved successfully', type: KaraokeStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getKaraokeStats(): Promise<KaraokeStatsResponseDto> {
    return this.karaokeService.getKaraokeStats();
  }

  @Post('songs/:songId/upload-multi-track')
  @UseGuards(UserAuthGuard)
  @UseInterceptors(FilesInterceptor('tracks', 4)) // Max 4 tracks (vocals, bass, drums, other)
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple karaoke tracks for a song (Admin only)' })
  @ApiResponse({ status: 201, description: 'Multi-track karaoke uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid files or song not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async uploadMultiTrackKaraoke(
    @Param('songId') songId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() karaokeData: MultiTrackKaraokeUploadDto,
  ): Promise<{ message: string; karaoke?: any }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No track files uploaded');
    }

    if (files.length > 4) {
      throw new BadRequestException('Maximum 4 tracks allowed (vocals, bass, drums, other)');
    }

    // Validate track types from form data
    const trackTypes = ['vocals', 'bass', 'drums', 'other'];
    const trackFiles: { [trackType: string]: { fileUrl: string; fileSize: number } } = {};

    try {
      // Upload each track file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const trackType = trackTypes[i]; // Assume files are uploaded in order

        // Validate audio file
        const allowedMimeTypes = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/aac',
          'audio/m4a',
          'audio/webm',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new BadRequestException(`Invalid file type for ${trackType}: ${file.mimetype}`);
        }

        // Upload file to Supabase Storage
        const fileUrl = await this.uploadService.uploadFile(
          file.buffer,
          'karaoke', // folder
          `${trackType}_${file.originalname}`,
          file.mimetype,
          songId, // entityId to create subfolder
        );

        if (!fileUrl) {
          throw new BadRequestException(`Failed to upload ${trackType} track to storage`);
        }

        trackFiles[trackType.toUpperCase()] = {
          fileUrl,
          fileSize: file.size,
        };
      }

      // Save multi-track karaoke information to database
      const karaoke = await this.karaokeService.uploadMultiTrackKaraoke(songId, karaokeData, trackFiles);

      return {
        message: 'Multi-track karaoke uploaded successfully',
        karaoke
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to upload multi-track karaoke: ${error.message}`);
    }
  }

  @Get('songs/:songId/tracks/:trackType/download')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get individual track download URL' })
  @ApiResponse({ status: 200, description: 'Track download URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Song or track not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrackDownloadUrl(
    @Param('songId') songId: string,
    @Param('trackType') trackType: string,
  ): Promise<KaraokeTrackDownloadDto> {
    // Validate track type
    const validTrackTypes = Object.values(TrackType);
    if (!validTrackTypes.includes(trackType.toUpperCase() as TrackType)) {
      throw new BadRequestException(`Invalid track type: ${trackType}. Valid types: ${validTrackTypes.join(', ')}`);
    }

    return this.karaokeService.getTrackDownloadUrl(songId, trackType.toUpperCase() as TrackType);
  }

  @Get('songs/:songId/tracks/download-all')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tracks download URLs for a song' })
  @ApiResponse({ status: 200, description: 'All tracks download URLs retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Song not found or no tracks available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllTracksDownloadUrls(
    @Param('songId') songId: string,
  ): Promise<{ [trackType: string]: KaraokeTrackDownloadDto }> {
    return this.karaokeService.getAllTracksDownloadUrls(songId);
  }
}
