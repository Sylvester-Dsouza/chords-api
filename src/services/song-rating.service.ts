import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { CreateSongRatingDto, UpdateSongRatingDto, SongRatingResponseDto, SongRatingStatsDto } from '../dto/song-rating.dto';

@Injectable()
export class SongRatingService {
  private readonly logger = new Logger(SongRatingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create a new song rating or update an existing one
   */
  async rateOrUpdate(customerId: string, createSongRatingDto: CreateSongRatingDto): Promise<SongRatingResponseDto> {
    const { songId, rating, comment } = createSongRatingDto;

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    try {
      // Check if the customer has already rated this song
      const existingRating = await this.prisma.songRating.findUnique({
        where: {
          songId_customerId: {
            songId,
            customerId,
          },
        },
      });

      let result;

      if (existingRating) {
        // Update existing rating
        result = await this.prisma.songRating.update({
          where: {
            id: existingRating.id,
          },
          data: {
            rating,
            comment,
            updatedAt: new Date(),
          },
        });
        this.logger.log(`Updated rating for song ${songId} by customer ${customerId}`);
      } else {
        // Create new rating
        result = await this.prisma.songRating.create({
          data: {
            songId,
            customerId,
            rating,
            comment,
          },
        });
        this.logger.log(`Created new rating for song ${songId} by customer ${customerId}`);
      }

      // Update the aggregated rating on the song
      await this.updateSongAggregatedRating(songId);

      // Invalidate cache
      await this.invalidateCache(songId);

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating/updating rating: ${errorMessage}`);
      throw new BadRequestException('Failed to create or update rating');
    }
  }

  /**
   * Get a specific rating by ID
   */
  async findOne(id: string): Promise<SongRatingResponseDto> {
    const rating = await this.prisma.songRating.findUnique({
      where: { id },
    });

    if (!rating) {
      throw new NotFoundException(`Rating with ID ${id} not found`);
    }

    return rating;
  }

  /**
   * Get a customer's rating for a specific song
   */
  async findByCustomerAndSong(customerId: string, songId: string): Promise<SongRatingResponseDto | null> {
    return this.prisma.songRating.findUnique({
      where: {
        songId_customerId: {
          songId,
          customerId,
        },
      },
    });
  }

  /**
   * Get all ratings for a song
   */
  async findAllForSong(songId: string): Promise<SongRatingResponseDto[]> {
    const cacheKey = this.cacheService.createKey(CachePrefix.SONG, `ratings:${songId}`);

    try {
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for song ratings ${songId}, fetching from database`);

          // Check if song exists
          const song = await this.prisma.song.findUnique({
            where: { id: songId },
          });

          if (!song) {
            throw new NotFoundException(`Song with ID ${songId} not found`);
          }

          return this.prisma.songRating.findMany({
            where: { songId },
            orderBy: { createdAt: 'desc' },
          });
        },
        CacheTTL.MEDIUM
      );
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching ratings for song ${songId}: ${errorMessage}`);

      // Fallback to direct database query
      return this.prisma.songRating.findMany({
        where: { songId },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  /**
   * Get all ratings by a customer
   */
  async findAllByCustomer(customerId: string): Promise<SongRatingResponseDto[]> {
    return this.prisma.songRating.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a rating
   */
  async update(id: string, customerId: string, updateSongRatingDto: UpdateSongRatingDto): Promise<SongRatingResponseDto> {
    // Check if rating exists and belongs to the customer
    const existingRating = await this.prisma.songRating.findUnique({
      where: { id },
    });

    if (!existingRating) {
      throw new NotFoundException(`Rating with ID ${id} not found`);
    }

    if (existingRating.customerId !== customerId) {
      throw new BadRequestException('You can only update your own ratings');
    }

    const { rating, comment } = updateSongRatingDto;

    try {
      const result = await this.prisma.songRating.update({
        where: { id },
        data: {
          rating,
          comment,
          updatedAt: new Date(),
        },
      });

      // Update the aggregated rating on the song
      await this.updateSongAggregatedRating(existingRating.songId);

      // Invalidate cache
      await this.invalidateCache(existingRating.songId);

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating rating: ${errorMessage}`);
      throw new BadRequestException('Failed to update rating');
    }
  }

  /**
   * Delete a rating
   */
  async remove(id: string, customerId: string): Promise<void> {
    // Check if rating exists and belongs to the customer
    const existingRating = await this.prisma.songRating.findUnique({
      where: { id },
    });

    if (!existingRating) {
      throw new NotFoundException(`Rating with ID ${id} not found`);
    }

    if (existingRating.customerId !== customerId) {
      throw new BadRequestException('You can only delete your own ratings');
    }

    try {
      await this.prisma.songRating.delete({
        where: { id },
      });

      // Update the aggregated rating on the song
      await this.updateSongAggregatedRating(existingRating.songId);

      // Invalidate cache
      await this.invalidateCache(existingRating.songId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting rating: ${errorMessage}`);
      throw new BadRequestException('Failed to delete rating');
    }
  }

  /**
   * Get rating statistics for a song
   */
  async getStats(songId: string): Promise<SongRatingStatsDto> {
    const cacheKey = this.cacheService.createKey(CachePrefix.SONG, `rating-stats:${songId}`);

    try {
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for song rating stats ${songId}, calculating from database`);

          // Check if song exists
          const song = await this.prisma.song.findUnique({
            where: { id: songId },
            select: { averageRating: true, ratingCount: true },
          });

          if (!song) {
            throw new NotFoundException(`Song with ID ${songId} not found`);
          }

          // Get distribution of ratings
          const ratings = await this.prisma.songRating.findMany({
            where: { songId },
            select: { rating: true },
          });

          const distribution = {
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0,
          };

          ratings.forEach(r => {
            const ratingKey = r.rating.toString() as '1' | '2' | '3' | '4' | '5';
            distribution[ratingKey]++;
          });

          return {
            averageRating: song.averageRating,
            ratingCount: song.ratingCount,
            distribution,
          };
        },
        CacheTTL.MEDIUM
      );
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error calculating rating stats for song ${songId}: ${errorMessage}`);

      // Return default stats
      return {
        averageRating: 0,
        ratingCount: 0,
        distribution: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 0,
        },
      };
    }
  }

  /**
   * Update the aggregated rating on a song
   */
  private async updateSongAggregatedRating(songId: string): Promise<void> {
    try {
      // Calculate average rating and count
      const result = await this.prisma.songRating.aggregate({
        where: { songId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const averageRating = result._avg.rating || 0;
      const ratingCount = result._count.rating || 0;

      // Update the song with the new aggregated values
      await this.prisma.song.update({
        where: { id: songId },
        data: {
          averageRating,
          ratingCount,
        },
      });

      this.logger.debug(`Updated aggregated rating for song ${songId}: avg=${averageRating}, count=${ratingCount}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating aggregated rating for song ${songId}: ${errorMessage}`);
      // Don't throw here to prevent the main operation from failing
    }
  }

  /**
   * Find all ratings with pagination and filtering
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    songId?: string;
    customerId?: string;
    minRating?: number;
    maxRating?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 10,
      songId,
      customerId,
      minRating,
      maxRating,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    if (songId) {
      where.songId = songId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set the end date to the end of the day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      // Get total count
      const total = await this.prisma.songRating.count({ where });

      // Get paginated ratings with relations
      const ratings = await this.prisma.songRating.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      return {
        data: ratings,
        total,
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching ratings: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch ratings');
    }
  }

  /**
   * Count all ratings
   */
  async countAll(): Promise<number> {
    return this.prisma.songRating.count();
  }

  /**
   * Get global average rating
   */
  async getGlobalAverageRating(): Promise<number> {
    const result = await this.prisma.songRating.aggregate({
      _avg: {
        rating: true,
      },
    });

    return result._avg.rating || 0;
  }

  /**
   * Get highest rated songs
   */
  async getHighestRatedSongs(limit: number = 5) {
    const songs = await this.prisma.song.findMany({
      where: {
        ratingCount: {
          gt: 0,
        },
      },
      select: {
        id: true,
        title: true,
        artist: {
          select: {
            name: true,
          },
        },
        averageRating: true,
        ratingCount: true,
      },
      orderBy: {
        averageRating: 'desc',
      },
      take: limit,
    });

    return songs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist?.name || 'Unknown Artist',
      averageRating: song.averageRating,
      ratingCount: song.ratingCount,
    }));
  }

  /**
   * Invalidate cache for a song's ratings
   */
  private async invalidateCache(songId: string): Promise<void> {
    try {
      // Invalidate ratings list cache
      const ratingsKey = this.cacheService.createKey(CachePrefix.SONG, `ratings:${songId}`);
      await this.cacheService.delete(ratingsKey);

      // Invalidate stats cache
      const statsKey = this.cacheService.createKey(CachePrefix.SONG, `rating-stats:${songId}`);
      await this.cacheService.delete(statsKey);

      // Invalidate song cache
      const songKey = this.cacheService.createKey(CachePrefix.SONG, songId);
      await this.cacheService.delete(songKey);

      // Invalidate songs list cache
      await this.cacheService.deleteByPrefix(CachePrefix.SONGS);

      // Invalidate global stats cache
      const globalStatsKey = this.cacheService.createKey(CachePrefix.SONG, 'global-rating-stats');
      await this.cacheService.delete(globalStatsKey);

      this.logger.debug(`Invalidated cache for song ${songId} ratings`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error invalidating cache for song ${songId}: ${errorMessage}`);
      // Don't throw here to prevent the main operation from failing
    }
  }
}
