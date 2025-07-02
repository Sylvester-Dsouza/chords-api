import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CacheTTL, CachePrefix } from './cache.service';
import {
  KaraokeUploadDto,
  KaraokeResponseDto,
  KaraokeSongResponseDto,
  KaraokeListQueryDto,
  KaraokeUpdateDto,
  KaraokeAnalyticsDto,
  KaraokeStatsResponseDto
} from '../dto/karaoke.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class KaraokeService {
  private readonly logger = new Logger(KaraokeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Upload karaoke file for a song
   */
  async uploadKaraoke(songId: string, karaokeData: KaraokeUploadDto, fileUrl: string, fileSize: number, uploadedBy?: string): Promise<KaraokeResponseDto> {
    try {
      // Check if song exists
      const song = await this.prisma.song.findUnique({
        where: { id: songId },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${songId} not found`);
      }

      // Check if karaoke already exists for this song
      const existingKaraoke = await this.prisma.karaoke.findUnique({
        where: { songId },
      });

      let karaoke;
      if (existingKaraoke) {
        // Update existing karaoke
        karaoke = await this.prisma.karaoke.update({
          where: { songId },
          data: {
            fileUrl,
            fileSize,
            duration: karaokeData.duration,
            key: karaokeData.key || song.key,
            quality: karaokeData.quality,
            notes: karaokeData.notes,
            uploadedBy,
            version: { increment: 1 },
            status: 'ACTIVE',
          },
        });
      } else {
        // Create new karaoke
        karaoke = await this.prisma.karaoke.create({
          data: {
            songId,
            fileUrl,
            fileSize,
            duration: karaokeData.duration,
            key: karaokeData.key || song.key,
            quality: karaokeData.quality,
            notes: karaokeData.notes,
            uploadedBy,
            status: 'ACTIVE',
          },
        });
      }

      // Invalidate caches
      await this.cacheService.deleteByPrefix(CachePrefix.SONGS);
      await this.cacheService.deleteByPrefix(CachePrefix.KARAOKE);

      this.logger.log(`Karaoke ${existingKaraoke ? 'updated' : 'uploaded'} successfully for song ${songId}`);

      return this.mapKaraokeToDto(karaoke);
    } catch (error: any) {
      this.logger.error(`Failed to upload karaoke for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove karaoke from a song
   */
  async removeKaraoke(songId: string): Promise<void> {
    try {
      // Check if karaoke exists for this song
      const karaoke = await this.prisma.karaoke.findUnique({
        where: { songId },
      });

      if (!karaoke) {
        throw new NotFoundException(`No karaoke found for song ${songId}`);
      }

      // Delete karaoke record
      await this.prisma.karaoke.delete({
        where: { songId },
      });

      // Invalidate caches
      await this.cacheService.deleteByPrefix(CachePrefix.SONGS);
      await this.cacheService.deleteByPrefix(CachePrefix.KARAOKE);

      this.logger.log(`Karaoke removed successfully for song ${songId}`);
    } catch (error: any) {
      this.logger.error(`Failed to remove karaoke for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update karaoke information
   */
  async updateKaraoke(karaokeId: string, updateData: KaraokeUpdateDto): Promise<KaraokeResponseDto> {
    try {
      const karaoke = await this.prisma.karaoke.update({
        where: { id: karaokeId },
        data: updateData,
      });

      // Invalidate caches
      await this.cacheService.deleteByPrefix(CachePrefix.SONGS);
      await this.cacheService.deleteByPrefix(CachePrefix.KARAOKE);

      this.logger.log(`Karaoke updated successfully: ${karaokeId}`);

      return this.mapKaraokeToDto(karaoke);
    } catch (error: any) {
      this.logger.error(`Failed to update karaoke ${karaokeId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get karaoke by ID
   */
  async getKaraokeById(karaokeId: string): Promise<KaraokeResponseDto> {
    try {
      const karaoke = await this.prisma.karaoke.findUnique({
        where: { id: karaokeId },
      });

      if (!karaoke) {
        throw new NotFoundException(`Karaoke with ID ${karaokeId} not found`);
      }

      return this.mapKaraokeToDto(karaoke);
    } catch (error: any) {
      this.logger.error(`Failed to get karaoke ${karaokeId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get karaoke by song ID
   */
  async getKaraokeBySongId(songId: string): Promise<KaraokeResponseDto | null> {
    try {
      const karaoke = await this.prisma.karaoke.findUnique({
        where: { songId },
      });

      return karaoke ? this.mapKaraokeToDto(karaoke) : null;
    } catch (error: any) {
      this.logger.error(`Failed to get karaoke for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper method to map Karaoke model to DTO
   */
  private mapKaraokeToDto(karaoke: any): KaraokeResponseDto {
    return {
      id: karaoke.id,
      songId: karaoke.songId,
      fileUrl: karaoke.fileUrl,
      fileSize: karaoke.fileSize,
      duration: karaoke.duration,
      key: karaoke.key,
      uploadedBy: karaoke.uploadedBy,
      uploadedAt: karaoke.uploadedAt,
      updatedAt: karaoke.updatedAt,
      version: karaoke.version,
      status: karaoke.status,
      quality: karaoke.quality,
      notes: karaoke.notes,
    };
  }

  /**
   * Get karaoke download URL for a song
   */
  async getKaraokeDownloadUrl(songId: string): Promise<{ downloadUrl: string; fileSize: number; duration: number }> {
    try {
      const cacheKey = this.cacheService.createKey(CachePrefix.KARAOKE, `download:${songId}`);

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const karaoke = await this.prisma.karaoke.findUnique({
            where: { songId },
            select: {
              fileUrl: true,
              fileSize: true,
              duration: true,
              status: true,
            },
          });

          if (!karaoke) {
            throw new NotFoundException(`No karaoke found for song ${songId}`);
          }

          if (karaoke.status !== 'ACTIVE') {
            throw new BadRequestException(`Karaoke for song ${songId} is not available (status: ${karaoke.status})`);
          }

          return {
            downloadUrl: karaoke.fileUrl,
            fileSize: karaoke.fileSize || 0,
            duration: karaoke.duration || 0,
          };
        },
        CacheTTL.SHORT // 1 minute cache for download URLs
      );
    } catch (error: any) {
      this.logger.error(`Failed to get karaoke download URL for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of all karaoke songs
   */
  async getKaraokeSongs(query: KaraokeListQueryDto): Promise<{ songs: KaraokeSongResponseDto[]; total: number; page: number; limit: number }> {
    try {
      const { search, key, difficulty, artistId, sort = 'popular', page = 1, limit = 20 } = query;
      
      const cacheKey = this.cacheService.createListKey(CachePrefix.KARAOKE, {
        search, key, difficulty, artistId, sort, page, limit
      });

      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          // Build where clause for karaoke table
          const karaokeWhere: Prisma.KaraokeWhereInput = {
            status: 'ACTIVE',
            song: {
              status: 'ACTIVE',
            },
          };

          // Add song-related filters
          if (search || key || difficulty || artistId) {
            karaokeWhere.song = {
              ...karaokeWhere.song,
            };

            if (search) {
              karaokeWhere.song.OR = [
                { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { artist: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              ];
            }

            if (key) {
              karaokeWhere.song.key = key;
            }

            if (difficulty) {
              karaokeWhere.song.difficulty = difficulty;
            }

            if (artistId) {
              karaokeWhere.song.artistId = artistId;
            }
          }

          // Build order by clause for karaoke queries
          let orderBy: Prisma.KaraokeOrderByWithRelationInput = {};
          switch (sort) {
            case 'popular':
              orderBy = { song: { viewCount: 'desc' } };
              break;
            case 'recent':
              orderBy = { uploadedAt: 'desc' };
              break;
            case 'title':
              orderBy = { song: { title: 'asc' } };
              break;
            case 'artist':
              orderBy = { song: { artist: { name: 'asc' } } };
              break;
            default:
              orderBy = { song: { viewCount: 'desc' } };
          }

          const skip = (page - 1) * limit;

          const [karaokeRecords, total] = await Promise.all([
            this.prisma.karaoke.findMany({
              where: karaokeWhere,
              orderBy,
              skip,
              take: limit,
              include: {
                song: {
                  include: {
                    artist: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            }),
            this.prisma.karaoke.count({ where: karaokeWhere }),
          ]);

          const karaokeSongs: KaraokeSongResponseDto[] = karaokeRecords.map(record => ({
            id: record.song.id,
            title: record.song.title,
            artistName: record.song.artist.name,
            imageUrl: record.song.imageUrl,
            songKey: record.song.key,
            tempo: record.song.tempo,
            difficulty: record.song.difficulty,
            viewCount: record.song.viewCount,
            averageRating: record.song.averageRating,
            ratingCount: record.song.ratingCount,
            createdAt: record.song.createdAt,
            karaoke: this.mapKaraokeToDto(record),
          }));

          return {
            songs: karaokeSongs,
            total,
            page,
            limit,
          };
        },
        CacheTTL.MEDIUM // 5 minutes cache
      );
    } catch (error: any) {
      this.logger.error(`Failed to get karaoke songs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track karaoke analytics
   */
  async trackAnalytics(analyticsData: KaraokeAnalyticsDto): Promise<void> {
    try {
      // For now, we'll just log the analytics
      // In the future, you could store this in a separate analytics table
      this.logger.log(`Karaoke analytics: ${JSON.stringify(analyticsData)}`);
      
      // Optionally increment view count for play actions
      if (analyticsData.action === 'play') {
        await this.prisma.song.update({
          where: { id: analyticsData.songId },
          data: {
            viewCount: { increment: 1 },
          },
        });
        
        // Invalidate song cache
        await this.cacheService.deleteByPrefix(CachePrefix.SONGS);
      }
    } catch (error: any) {
      this.logger.error(`Failed to track karaoke analytics: ${error.message}`);
      // Don't throw error for analytics failures
    }
  }

  /**
   * Get karaoke statistics for admin dashboard
   */
  async getKaraokeStats(): Promise<KaraokeStatsResponseDto> {
    try {
      const cacheKey = this.cacheService.createKey(CachePrefix.KARAOKE, 'stats');
      
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const [totalKaraokeSongs, totalStorageUsed, popularKaraoke, recentKaraoke] = await Promise.all([
            // Total karaoke songs count
            this.prisma.karaoke.count({
              where: {
                status: 'ACTIVE',
                song: { status: 'ACTIVE' }
              },
            }),

            // Total storage used (sum of file sizes)
            this.prisma.karaoke.aggregate({
              where: {
                status: 'ACTIVE',
                song: { status: 'ACTIVE' }
              },
              _sum: { fileSize: true },
            }),

            // Popular karaoke songs (top 5)
            this.prisma.karaoke.findMany({
              where: {
                status: 'ACTIVE',
                song: { status: 'ACTIVE' }
              },
              orderBy: { song: { viewCount: 'desc' } },
              take: 5,
              include: {
                song: {
                  include: {
                    artist: { select: { name: true } },
                  },
                },
              },
            }),

            // Recent karaoke songs (top 5)
            this.prisma.karaoke.findMany({
              where: {
                status: 'ACTIVE',
                song: { status: 'ACTIVE' }
              },
              orderBy: { uploadedAt: 'desc' },
              take: 5,
              include: {
                song: {
                  include: {
                    artist: { select: { name: true } },
                  },
                },
              },
            }),
          ]);

          const mapKaraokeToSongResponse = (karaokeRecord: any): KaraokeSongResponseDto => ({
            id: karaokeRecord.song.id,
            title: karaokeRecord.song.title,
            artistName: karaokeRecord.song.artist.name,
            imageUrl: karaokeRecord.song.imageUrl,
            songKey: karaokeRecord.song.key,
            tempo: karaokeRecord.song.tempo,
            difficulty: karaokeRecord.song.difficulty,
            viewCount: karaokeRecord.song.viewCount,
            averageRating: karaokeRecord.song.averageRating,
            ratingCount: karaokeRecord.song.ratingCount,
            createdAt: karaokeRecord.song.createdAt,
            karaoke: this.mapKaraokeToDto(karaokeRecord),
          });

          return {
            totalKaraokeSongs,
            totalDownloads: 0, // TODO: Implement download tracking
            totalPlays: 0, // TODO: Implement play tracking
            totalStorageUsed: totalStorageUsed._sum.fileSize || 0,
            popularSongs: popularKaraoke.map(mapKaraokeToSongResponse),
            recentSongs: recentKaraoke.map(mapKaraokeToSongResponse),
          };
        },
        CacheTTL.LONG // 30 minutes cache for stats
      );
    } catch (error: any) {
      this.logger.error(`Failed to get karaoke stats: ${error.message}`);
      throw error;
    }
  }
}
