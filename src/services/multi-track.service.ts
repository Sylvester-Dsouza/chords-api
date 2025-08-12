import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CacheTTL, CachePrefix } from './cache.service';
import {
  MultiTrackUploadDto,
  MultiTrackResponseDto,
  MultiTrackSongResponseDto,
  MultiTrackListQueryDto,
  MultiTrackUpdateDto,
  MultiTrackAnalyticsDto,
  MultiTrackStatsResponseDto,
  MultiTrackDownloadDto,
  TrackType
} from '../dto/multi-track.dto';
import { Prisma } from '@prisma/client';

// Define the Song with MultiTrack relation type
type SongWithMultiTrack = Prisma.SongGetPayload<{
  include: {
    artist: true;
    multiTrack: true;
  };
}>;

@Injectable()
export class MultiTrackService {
  private readonly logger = new Logger(MultiTrackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Upload multi-track files for a song
   */
  async uploadMultiTrack(
    songId: string,
    multiTrackData: MultiTrackUploadDto
  ): Promise<MultiTrackResponseDto> {
    try {
      // Check if song exists
      const song = await this.prisma.song.findUnique({
        where: { id: songId },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${songId} not found`);
      }

      // Check if multi-track already exists for this song
      const existingMultiTrack = await this.prisma.multiTrack.findUnique({
        where: { songId },
      });

      let multiTrack;
      if (existingMultiTrack) {
        // Update existing multi-track
        multiTrack = await this.prisma.multiTrack.update({
          where: { songId },
          data: {
            vocalsUrl: multiTrackData.vocalsUrl,
            bassUrl: multiTrackData.bassUrl,
            drumsUrl: multiTrackData.drumsUrl,
            otherUrl: multiTrackData.otherUrl,
          },
        });
      } else {
        // Create new multi-track
        multiTrack = await this.prisma.multiTrack.create({
          data: {
            songId,
            vocalsUrl: multiTrackData.vocalsUrl,
            bassUrl: multiTrackData.bassUrl,
            drumsUrl: multiTrackData.drumsUrl,
            otherUrl: multiTrackData.otherUrl,
          },
        });

        // Update song to indicate it has multi-track
        await this.prisma.song.update({
          where: { id: songId },
          data: { hasMultiTrack: true },
        });
      }

      // Clear cache
      await this.cacheService.delete(`${CachePrefix.MULTI_TRACK_SONGS}:*`);
      await this.cacheService.delete(`${CachePrefix.MULTI_TRACK_STATS}:*`);

      this.logger.log(`Multi-track uploaded successfully for song ${songId}`);

      return {
        id: multiTrack.id,
        songId: multiTrack.songId,
        vocalsUrl: multiTrack.vocalsUrl,
        bassUrl: multiTrack.bassUrl,
        drumsUrl: multiTrack.drumsUrl,
        otherUrl: multiTrack.otherUrl,
        uploadedAt: multiTrack.uploadedAt,
        updatedAt: multiTrack.updatedAt,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload multi-track for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all multi-track songs with filtering and pagination
   */
  async getMultiTrackSongs(query: MultiTrackListQueryDto): Promise<{
    songs: MultiTrackSongResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { search, key, difficulty, artistId, sort = 'popular', page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.SongWhereInput = {
        multiTrack: {
          isNot: null, // Song has a multiTrack record
        },
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { artist: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (key) {
        where.key = key;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (artistId) {
        where.artistId = artistId;
      }

      // Get total count
      const total = await this.prisma.song.count({ where });

      // Get songs with multi-track
      const songs = await this.prisma.song.findMany({
        where,
        include: {
          artist: true,
          multiTrack: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }) as SongWithMultiTrack[];

      const multiTrackSongs: MultiTrackSongResponseDto[] = songs.map(song => ({
        id: song.id,
        title: song.title,
        artistName: song.artist.name,
        imageUrl: song.imageUrl,
        songKey: song.key,
        tempo: song.tempo,
        difficulty: song.difficulty,
        viewCount: song.viewCount,
        averageRating: song.averageRating,
        ratingCount: song.ratingCount,
        createdAt: song.createdAt,
        multiTrack: {
          id: song.multiTrack!.id,
          songId: song.multiTrack!.songId,
          vocalsUrl: song.multiTrack!.vocalsUrl,
          bassUrl: song.multiTrack!.bassUrl,
          drumsUrl: song.multiTrack!.drumsUrl,
          otherUrl: song.multiTrack!.otherUrl,
          uploadedAt: song.multiTrack!.uploadedAt,
          updatedAt: song.multiTrack!.updatedAt,
        },
      }));

      return {
        songs: multiTrackSongs,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get multi-track songs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get multi-track by song ID
   */
  async getMultiTrackBySongId(songId: string): Promise<MultiTrackResponseDto> {
    try {
      const multiTrack = await this.prisma.multiTrack.findUnique({
        where: { songId },
      });

      if (!multiTrack) {
        throw new NotFoundException(`Multi-track not found for song ${songId}`);
      }

      return {
        id: multiTrack.id,
        songId: multiTrack.songId,
        vocalsUrl: multiTrack.vocalsUrl,
        bassUrl: multiTrack.bassUrl,
        drumsUrl: multiTrack.drumsUrl,
        otherUrl: multiTrack.otherUrl,
        uploadedAt: multiTrack.uploadedAt,
        updatedAt: multiTrack.updatedAt,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get multi-track for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update multi-track information
   */
  async updateMultiTrack(
    songId: string,
    updateData: MultiTrackUpdateDto
  ): Promise<MultiTrackResponseDto> {
    try {
      const existingMultiTrack = await this.prisma.multiTrack.findUnique({
        where: { songId },
      });

      if (!existingMultiTrack) {
        throw new NotFoundException(`Multi-track not found for song ${songId}`);
      }

      const updatedMultiTrack = await this.prisma.multiTrack.update({
        where: { songId },
        data: updateData,
      });

      // Clear cache
      await this.cacheService.delete(`${CachePrefix.MULTI_TRACK_SONGS}:*`);

      return {
        id: updatedMultiTrack.id,
        songId: updatedMultiTrack.songId,
        vocalsUrl: updatedMultiTrack.vocalsUrl,
        bassUrl: updatedMultiTrack.bassUrl,
        drumsUrl: updatedMultiTrack.drumsUrl,
        otherUrl: updatedMultiTrack.otherUrl,
        uploadedAt: updatedMultiTrack.uploadedAt,
        updatedAt: updatedMultiTrack.updatedAt,
      };
    } catch (error: any) {
      this.logger.error(`Failed to update multi-track for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete multi-track for a song
   */
  async deleteMultiTrack(songId: string): Promise<{ message: string }> {
    try {
      const existingMultiTrack = await this.prisma.multiTrack.findUnique({
        where: { songId },
      });

      if (!existingMultiTrack) {
        throw new NotFoundException(`Multi-track not found for song ${songId}`);
      }

      // Delete multi-track (tracks will be deleted due to cascade)
      await this.prisma.multiTrack.delete({
        where: { songId },
      });

      // Update song to indicate it no longer has multi-track
      await this.prisma.song.update({
        where: { id: songId },
        data: { hasMultiTrack: false },
      });

      // Clear cache
      await this.cacheService.delete(`${CachePrefix.MULTI_TRACK_SONGS}:*`);
      await this.cacheService.delete(`${CachePrefix.MULTI_TRACK_STATS}:*`);

      this.logger.log(`Multi-track deleted successfully for song ${songId}`);

      return { message: 'Multi-track deleted successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to delete multi-track for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get multi-track download URLs for all tracks
   */
  async getMultiTrackDownloadUrls(songId: string): Promise<MultiTrackDownloadDto> {
    try {
      const cacheKey = `${CachePrefix.MULTI_TRACK_DOWNLOAD}:${songId}`;

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const multiTrack = await this.prisma.multiTrack.findUnique({
            where: { songId },
            select: {
              vocalsUrl: true,
              bassUrl: true,
              drumsUrl: true,
              otherUrl: true,
            },
          });

          if (!multiTrack) {
            throw new NotFoundException(`No multi-track found for song ${songId}`);
          }

          return {
            vocalsUrl: multiTrack.vocalsUrl,
            bassUrl: multiTrack.bassUrl,
            drumsUrl: multiTrack.drumsUrl,
            otherUrl: multiTrack.otherUrl,
          };
        },
        CacheTTL.SHORT // 1 minute cache for download URLs
      );
    } catch (error: any) {
      this.logger.error(`Failed to get multi-track download URLs for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get multi-track statistics
   */
  async getMultiTrackStats(): Promise<MultiTrackStatsResponseDto> {
    try {
      const cacheKey = `${CachePrefix.MULTI_TRACK_STATS}:overview`;

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          // Get total multi-track songs
          const totalMultiTrackSongs = await this.prisma.song.count({
            where: {
              hasMultiTrack: true,
              status: 'ACTIVE',
            },
          });

          // Get popular songs (top 10 by view count)
          const popularSongs = await this.prisma.song.findMany({
            where: {
              hasMultiTrack: true,
              status: 'ACTIVE',
            },
            include: {
              artist: true,
              multiTrack: true,
            },
            orderBy: { viewCount: 'desc' },
            take: 10,
          });

          // Get recent songs (last 10 added)
          const recentSongs = await this.prisma.song.findMany({
            where: {
              hasMultiTrack: true,
              status: 'ACTIVE',
            },
            include: {
              artist: true,
              multiTrack: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

          const mapSongToResponse = (song: any): MultiTrackSongResponseDto => ({
            id: song.id,
            title: song.title,
            artistName: song.artist.name,
            imageUrl: song.imageUrl,
            songKey: song.key,
            tempo: song.tempo,
            difficulty: song.difficulty,
            viewCount: song.viewCount,
            averageRating: song.averageRating,
            ratingCount: song.ratingCount,
            createdAt: song.createdAt,
            multiTrack: {
              id: song.multiTrack.id,
              songId: song.multiTrack.songId,
              vocalsUrl: song.multiTrack.vocalsUrl,
              bassUrl: song.multiTrack.bassUrl,
              drumsUrl: song.multiTrack.drumsUrl,
              otherUrl: song.multiTrack.otherUrl,
              uploadedAt: song.multiTrack.uploadedAt,
              updatedAt: song.multiTrack.updatedAt,
            },
          });

          return {
            totalMultiTrackSongs,
            popularSongs: popularSongs.map(mapSongToResponse),
            recentSongs: recentSongs.map(mapSongToResponse),
          };
        },
        CacheTTL.MEDIUM // 5 minutes cache
      );
    } catch (error: any) {
      this.logger.error(`Failed to get multi-track stats: ${error.message}`);
      throw error;
    }
  }



  /**
   * Track multi-track analytics
   */
  async trackAnalytics(analyticsData: MultiTrackAnalyticsDto): Promise<void> {
    try {
      // TODO: Implement analytics tracking
      // This could store analytics data in a separate table or send to an analytics service
      this.logger.log(`Multi-track analytics tracked: ${analyticsData.action} for song ${analyticsData.songId}`);
    } catch (error: any) {
      this.logger.error(`Failed to track multi-track analytics: ${error.message}`);
      // Don't throw error for analytics failures
    }
  }
}
