import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { CreateSongDto, UpdateSongDto, SongResponseDto } from '../dto/song.dto';
import { Song } from '@prisma/client';

@Injectable()
export class SongService {
  private readonly logger = new Logger(SongService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async create(createSongDto: CreateSongDto): Promise<SongResponseDto> {
    // Check if artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: createSongDto.artistId },
    });

    if (!artist) {
      throw new BadRequestException(`Artist with ID ${createSongDto.artistId} not found`);
    }

    // Check if language exists if provided
    if (createSongDto.languageId) {
      const language = await this.prisma.language.findUnique({
        where: { id: createSongDto.languageId },
      });

      if (!language) {
        throw new BadRequestException(`Language with ID ${createSongDto.languageId} not found`);
      }
    }

    // Create the song
    const song = await this.prisma.song.create({
      data: createSongDto,
      include: {
        artist: true,
        language: true,
      },
    });

    // Invalidate songs list cache
    await this.cacheService.deleteByPrefix(CachePrefix.SONGS);
    this.logger.debug(`Invalidated songs list cache after creating song ${song.id}`);

    return song;
  }

  async findAll(search?: string, artistId?: string, tags?: string): Promise<SongResponseDto[]> {
    // Create a cache key based on the filters
    const filters = { search, artistId, tags };
    const cacheKey = this.cacheService.createListKey(CachePrefix.SONGS, filters);

    try {
      // Try to get from cache first
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for songs list with filters: ${JSON.stringify(filters)}`);

          const where: any = {};

          // Add search filter
          if (search) {
            where.OR = [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                artist: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            ];
          }

          // Add artist filter
          if (artistId) {
            where.artistId = artistId;
          }

          // Add tags filter
          if (tags) {
            const tagList = tags.split(',').map(tag => tag.trim());
            where.tags = {
              hasSome: tagList,
            };
          }

          return this.prisma.song.findMany({
            where,
            include: {
              artist: true,
              language: true,
            },
            orderBy: {
              title: 'asc',
            },
          });
        },
        // Use shorter TTL for search results
        search ? CacheTTL.SHORT : CacheTTL.MEDIUM
      );
    } catch (error: any) {
      this.logger.error(`Error fetching songs with filters ${JSON.stringify(filters)}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const where: any = {};

      // Add search filter
      if (search) {
        where.OR = [
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            artist: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      // Add artist filter
      if (artistId) {
        where.artistId = artistId;
      }

      // Add tags filter
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        where.tags = {
          hasSome: tagList,
        };
      }

      return this.prisma.song.findMany({
        where,
        include: {
          artist: true,
          language: true,
        },
        orderBy: {
          title: 'asc',
        },
      });
    }
  }

  async findOne(id: string): Promise<SongResponseDto> {
    const cacheKey = this.cacheService.createKey(CachePrefix.SONG, id);

    try {
      // Try to get from cache first
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for song ${id}, fetching from database`);
          const song = await this.prisma.song.findUnique({
            where: { id },
            include: {
              artist: true,
              language: true,
            },
          });

          if (!song) {
            throw new NotFoundException(`Song with ID ${id} not found`);
          }

          return song;
        },
        CacheTTL.LONG // Songs don't change often
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching song ${id}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const song = await this.prisma.song.findUnique({
        where: { id },
        include: {
          artist: true,
          language: true,
        },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${id} not found`);
      }

      return song;
    }
  }

  async update(id: string, updateSongDto: UpdateSongDto): Promise<SongResponseDto> {
    // Check if song exists
    await this.findOne(id);

    // If artistId is provided, check if artist exists
    if (updateSongDto.artistId) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: updateSongDto.artistId },
      });

      if (!artist) {
        throw new BadRequestException(`Artist with ID ${updateSongDto.artistId} not found`);
      }
    }

    // If languageId is provided, check if language exists
    if (updateSongDto.languageId) {
      const language = await this.prisma.language.findUnique({
        where: { id: updateSongDto.languageId },
      });

      if (!language) {
        throw new BadRequestException(`Language with ID ${updateSongDto.languageId} not found`);
      }
    }

    // Update song
    const updatedSong = await this.prisma.song.update({
      where: { id },
      data: updateSongDto,
      include: {
        artist: true,
        language: true,
      },
    });

    // Invalidate specific song cache
    const songCacheKey = this.cacheService.createKey(CachePrefix.SONG, id);
    await this.cacheService.delete(songCacheKey);

    // Invalidate songs list cache
    await this.cacheService.deleteByPrefix(CachePrefix.SONGS);

    this.logger.debug(`Invalidated cache for song ${id} after update`);

    return updatedSong;
  }

  async remove(id: string): Promise<SongResponseDto> {
    // Check if song exists
    await this.findOne(id);

    // Delete song
    const deletedSong = await this.prisma.song.delete({
      where: { id },
      include: {
        artist: true,
        language: true,
      },
    });

    // Invalidate specific song cache
    const songCacheKey = this.cacheService.createKey(CachePrefix.SONG, id);
    await this.cacheService.delete(songCacheKey);

    // Invalidate songs list cache
    await this.cacheService.deleteByPrefix(CachePrefix.SONGS);

    this.logger.debug(`Invalidated cache for song ${id} after deletion`);

    return deletedSong;
  }
}
