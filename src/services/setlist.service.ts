import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { CreateSetlistDto, UpdateSetlistDto, SetlistResponseDto } from '../dto/setlist.dto';

@Injectable()
export class SetlistService {
  private readonly logger = new Logger(SetlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async create(customerId: string, createSetlistDto: CreateSetlistDto): Promise<SetlistResponseDto> {
    // Create the setlist
    const setlist = await this.prisma.setlist.create({
      data: {
        name: createSetlistDto.name,
        description: createSetlistDto.description,
        customer: {
          connect: { id: customerId },
        },
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after creation`);

    return setlist;
  }

  async findAllByCustomer(customerId: string): Promise<SetlistResponseDto[]> {
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);

    try {
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for setlists of customer ${customerId}`);

          return this.prisma.setlist.findMany({
            where: {
              customerId,
            },
            include: {
              songs: {
                include: {
                  artist: true,
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
          });
        },
        CacheTTL.MEDIUM // Setlists change moderately often
      );
    } catch (error: any) {
      this.logger.error(`Error fetching setlists for customer ${customerId}: ${error.message}`);

      // Fallback to direct database query
      return this.prisma.setlist.findMany({
        where: {
          customerId,
        },
        include: {
          songs: {
            include: {
              artist: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    }
  }

  async findOne(id: string, customerId: string): Promise<SetlistResponseDto> {
    const setlist = await this.prisma.setlist.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!setlist) {
      throw new NotFoundException(`Setlist with ID ${id} not found`);
    }

    // Check if the setlist belongs to the customer
    if (setlist.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to access this setlist');
    }

    return setlist;
  }

  async update(id: string, customerId: string, updateSetlistDto: UpdateSetlistDto): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Update setlist
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id },
      data: updateSetlistDto,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedSetlist;
  }

  async addSong(setlistId: string, customerId: string, songId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    const setlist = await this.findOne(setlistId, customerId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is already in the setlist
    const songs = setlist.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (songExists) {
      throw new BadRequestException(`Song with ID ${songId} is already in the setlist`);
    }

    // Add song to setlist
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: {
        songs: {
          connect: { id: songId },
        },
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedSetlist;
  }

  async addMultipleSongs(setlistId: string, customerId: string, songIds: string[]): Promise<SetlistResponseDto> {
    this.logger.debug(`Adding ${songIds.length} songs to setlist ${setlistId} for customer ${customerId}`);

    // Check if setlist exists and belongs to the customer
    const setlist = await this.findOne(setlistId, customerId);

    // Validate all songs exist in a single query
    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
      select: { id: true }, // Only select ID for performance
    });

    if (songs.length !== songIds.length) {
      const foundSongIds = songs.map(s => s.id);
      const missingSongIds = songIds.filter(id => !foundSongIds.includes(id));
      throw new NotFoundException(`Songs with IDs ${missingSongIds.join(', ')} not found`);
    }

    // Get existing song IDs in the setlist
    const existingSongIds = (setlist.songs || []).map(s => s.id);

    // Filter out songs that are already in the setlist
    const newSongIds = songIds.filter(id => !existingSongIds.includes(id));

    if (newSongIds.length === 0) {
      throw new BadRequestException('All selected songs are already in the setlist');
    }

    this.logger.debug(`Adding ${newSongIds.length} new songs to setlist (${songIds.length - newSongIds.length} were already in setlist)`);

    // Add all new songs to setlist in a single operation
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: {
        songs: {
          connect: newSongIds.map(id => ({ id })),
        },
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after adding songs`);

    return updatedSetlist;
  }

  async removeSong(setlistId: string, customerId: string, songId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    const setlist = await this.findOne(setlistId, customerId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is in the setlist
    const songs = setlist.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (!songExists) {
      throw new BadRequestException(`Song with ID ${songId} is not in the setlist`);
    }

    // Remove song from setlist
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: {
        songs: {
          disconnect: { id: songId },
        },
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedSetlist;
  }

  async remove(id: string, customerId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Delete setlist
    const deletedSetlist = await this.prisma.setlist.delete({
      where: { id },
      include: {
        songs: true,
      },
    });

    return deletedSetlist;
  }
}
