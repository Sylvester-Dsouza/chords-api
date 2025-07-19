import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import {
  CreateSetlistDto,
  UpdateSetlistDto,
  SetlistResponseDto,
  ShareSetlistDto,
  SetlistSettingsDto,
  SetlistCollaboratorResponseDto,
} from '../dto/setlist.dto';

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
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    // Transform setlistSongs to songs for backward compatibility
    const transformedSetlist = {
      ...setlist,
      songs: setlist.setlistSongs.map(ss => ss.song),
    };

    // Remove setlistSongs from response to maintain API contract
    delete (transformedSetlist as any).setlistSongs;

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after creation`);

    return transformedSetlist;
  }

  async findAllByCustomer(customerId: string, since?: string, limit?: number): Promise<SetlistResponseDto[]> {
    const cacheKey = this.cacheService.createListKey(CachePrefix.SETLISTS, { customerId, since: since || 'all' });

    try {
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for setlists of customer ${customerId} ${since ? `since ${since}` : 'all'}`);

          const where: any = {
            customerId,
          };

          // If since timestamp is provided, only get setlists updated after that time
          if (since) {
            where.updatedAt = {
              gt: new Date(since)
            };
          }

          const setlists = await this.prisma.setlist.findMany({
            where,
            include: {
              setlistSongs: {
                include: {
                  song: {
                    include: {
                      artist: true,
                    },
                  },
                },
                orderBy: {
                  position: 'asc',
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: limit, // Apply limit if provided
          });

          this.logger.debug(`Found ${setlists.length} setlists for customer ${customerId} ${since ? `updated since ${since}` : 'total'}`);

          // Transform setlistSongs to songs for backward compatibility
          const transformedSetlists = setlists.map(setlist => {
            const transformed = {
              ...setlist,
              songs: setlist.setlistSongs.map(ss => ss.song),
            };
            delete (transformed as any).setlistSongs; // Remove from response
            return transformed;
          });

          return transformedSetlists;
        },
        since ? CacheTTL.SHORT : CacheTTL.MEDIUM // Shorter cache for incremental updates
      );
    } catch (error: any) {
      this.logger.error(`Error fetching setlists for customer ${customerId}: ${error.message}`);

      // Fallback to direct database query
      const where: any = { customerId };
      if (since) {
        where.updatedAt = { gt: new Date(since) };
      }

      const setlists = await this.prisma.setlist.findMany({
        where,
        include: {
          setlistSongs: {
            include: {
              song: {
                include: {
                  artist: true,
                },
              },
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
      });

      // Transform setlistSongs to songs for backward compatibility
      return setlists.map(setlist => {
        const transformed = {
          ...setlist,
          songs: setlist.setlistSongs.map(ss => ss.song),
        };
        delete (transformed as any).setlistSongs; // Remove from response
        return transformed;
      });
    }
  }

  async findOne(id: string, customerId: string): Promise<SetlistResponseDto> {
    // Use collaborative access checking instead of simple ownership check
    await this.checkSetlistAccess(id, customerId, 'VIEW');

    // Create cache key for individual setlist
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLIST, id);

    try {
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for setlist ${id}, fetching from database`);

          // Get full setlist data with songs
          const fullSetlist = await this.prisma.setlist.findUnique({
            where: { id },
            include: {
              setlistSongs: {
                include: {
                  song: {
                    include: {
                      artist: true,
                    },
                  },
                },
                orderBy: {
                  position: 'asc',
                },
              },
            },
          });

          if (!fullSetlist) {
            throw new NotFoundException(`Setlist with ID ${id} not found`);
          }

          // Transform setlistSongs to songs for backward compatibility
          const transformedSetlist = {
            ...fullSetlist,
            songs: fullSetlist.setlistSongs.map(ss => ss.song),
          };

          // Remove setlistSongs from response to maintain API contract
          delete (transformedSetlist as any).setlistSongs;

          return transformedSetlist;
        },
        CacheTTL.SHORT // Use short TTL since setlists change frequently
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching setlist ${id}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const fullSetlist = await this.prisma.setlist.findUnique({
        where: { id },
        include: {
          setlistSongs: {
            include: {
              song: {
                include: {
                  artist: true,
                },
              },
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });

      if (!fullSetlist) {
        throw new NotFoundException(`Setlist with ID ${id} not found`);
      }

      // Transform setlistSongs to songs for backward compatibility
      const transformedSetlist = {
        ...fullSetlist,
        songs: fullSetlist.setlistSongs.map(ss => ss.song),
      };

      // Remove setlistSongs from response to maintain API contract
      delete (transformedSetlist as any).setlistSongs;

      return transformedSetlist;
    }
  }

  async update(id: string, customerId: string, updateSetlistDto: UpdateSetlistDto): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Update setlist
    await this.prisma.setlist.update({
      where: { id },
      data: updateSetlistDto,
    });

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after update`);

    // Also invalidate specific setlist cache
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, id);
    await this.cacheService.delete(setlistCacheKey);
    this.logger.debug(`Invalidated specific setlist cache for ${id} after update`);

    // Return updated setlist with proper structure
    return this.findOne(id, customerId);
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
    const existingSetlistSong = await this.prisma.setlistSong.findUnique({
      where: {
        setlistId_songId: {
          setlistId,
          songId,
        },
      },
    });

    if (existingSetlistSong) {
      throw new BadRequestException(`Song with ID ${songId} is already in the setlist`);
    }

    // Check if we need to migrate existing songs first
    const existingSetlistSongs = await this.prisma.setlistSong.findMany({
      where: { setlistId },
    });

    // Migration is no longer needed since the old relation doesn't exist

    // Get the next position (max position + 1)
    const maxPosition = await this.prisma.setlistSong.aggregate({
      where: { setlistId },
      _max: { position: true },
    });

    const nextPosition = (maxPosition._max.position ?? -1) + 1;

    // Add song to setlist using SetlistSong junction table
    await this.prisma.setlistSong.create({
      data: {
        setlistId,
        songId,
        position: nextPosition,
        addedBy: customerId,
      },
    });

    // Targeted cache invalidation - only invalidate what's necessary
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    const setlistsCacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
  
    await Promise.all([
      this.cacheService.delete(setlistCacheKey),
      this.cacheService.delete(setlistsCacheKey),
    ]);
  
    this.logger.debug(`Invalidated targeted caches for setlist ${setlistId} after adding song`);

    // Return updated setlist
    return this.findOne(setlistId, customerId);
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
    const existingSetlistSongs = await this.prisma.setlistSong.findMany({
      where: { setlistId },
      select: { songId: true },
    });
    const existingSongIds = existingSetlistSongs.map(ss => ss.songId);

    // Filter out songs that are already in the setlist
    const newSongIds = songIds.filter(id => !existingSongIds.includes(id));

    if (newSongIds.length === 0) {
      throw new BadRequestException('All selected songs are already in the setlist');
    }

    this.logger.debug(`Adding ${newSongIds.length} new songs to setlist (${songIds.length - newSongIds.length} were already in setlist)`);

    // Get the current max position
    const maxPosition = await this.prisma.setlistSong.aggregate({
      where: { setlistId },
      _max: { position: true },
    });

    const startPosition = (maxPosition._max.position ?? -1) + 1;

    // Create SetlistSong records for all new songs
    const setlistSongData = newSongIds.map((songId, index) => ({
      setlistId,
      songId,
      position: startPosition + index,
      addedBy: customerId,
    }));

    await this.prisma.setlistSong.createMany({
      data: setlistSongData,
    });

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after adding songs`);

    // Also invalidate specific setlist cache
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(setlistCacheKey);
    this.logger.debug(`Invalidated specific setlist cache for ${setlistId} after adding songs`);

    // Aggressively invalidate all setlist-related caches to ensure consistency
    await this.cacheService.deleteByPrefix(CachePrefix.SETLISTS);
    this.logger.debug(`Aggressively invalidated all setlist caches after adding songs`);

    // Return updated setlist
    return this.findOne(setlistId, customerId);
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
    const setlistSong = await this.prisma.setlistSong.findUnique({
      where: {
        setlistId_songId: {
          setlistId,
          songId,
        },
      },
    });

    if (!setlistSong) {
      throw new BadRequestException(`Song with ID ${songId} is not in the setlist`);
    }

    // Remove song from setlist and reorder remaining songs
    await this.prisma.$transaction(async (tx) => {
      // Delete the setlist song
      await tx.setlistSong.delete({
        where: {
          setlistId_songId: {
            setlistId,
            songId,
          },
        },
      });

      // Reorder remaining songs to fill the gap
      await tx.setlistSong.updateMany({
        where: {
          setlistId,
          position: {
            gt: setlistSong.position,
          },
        },
        data: {
          position: {
            decrement: 1,
          },
        },
      });
    });

    // Invalidate cache - BOTH list and individual setlist
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after removing song`);

    // Also invalidate specific setlist cache
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(setlistCacheKey);
    this.logger.debug(`Invalidated specific setlist cache for ${setlistId} after removing song`);

    // Aggressively invalidate all setlist-related caches to ensure consistency
    await this.cacheService.deleteByPrefix(CachePrefix.SETLISTS);
    this.logger.debug(`Aggressively invalidated all setlist caches after removing song`);

    // Return updated setlist
    return this.findOne(setlistId, customerId);
  }

  async removeMultipleSongs(setlistId: string, customerId: string, songIds: string[]): Promise<SetlistResponseDto> {
    this.logger.debug(`Removing ${songIds.length} songs from setlist ${setlistId} for customer ${customerId}`);

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

    // Get existing setlist songs
    const existingSetlistSongs = await this.prisma.setlistSong.findMany({
      where: { setlistId },
      select: { songId: true, position: true },
      orderBy: { position: 'asc' },
    });

    const existingSongIds = existingSetlistSongs.map(ss => ss.songId);

    // Filter to only songs that are actually in the setlist
    const songsToRemove = songIds.filter(id => existingSongIds.includes(id));

    if (songsToRemove.length === 0) {
      throw new BadRequestException('None of the selected songs are in the setlist');
    }

    this.logger.debug(`Removing ${songsToRemove.length} songs from setlist (${songIds.length - songsToRemove.length} were not in setlist)`);

    // Remove songs and reorder in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete the setlist songs
      await tx.setlistSong.deleteMany({
        where: {
          setlistId,
          songId: {
            in: songsToRemove,
          },
        },
      });

      // Get remaining songs and reorder them
      const remainingSongs = await tx.setlistSong.findMany({
        where: { setlistId },
        orderBy: { position: 'asc' },
      });

      // Update positions to be sequential (0, 1, 2, ...)
      for (let i = 0; i < remainingSongs.length; i++) {
        await tx.setlistSong.update({
          where: { id: remainingSongs[i].id },
          data: { position: i },
        });
      }
    });

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after removing songs`);

    // Also invalidate specific setlist cache
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(setlistCacheKey);
    this.logger.debug(`Invalidated specific setlist cache for ${setlistId} after removing songs`);

    // Aggressively invalidate all setlist-related caches to ensure consistency
    await this.cacheService.deleteByPrefix(CachePrefix.SETLISTS);
    this.logger.debug(`Aggressively invalidated all setlist caches after removing songs`);

    // Return updated setlist
    return this.findOne(setlistId, customerId);
  }

  async reorderSongs(setlistId: string, customerId: string, songIds: string[]): Promise<SetlistResponseDto> {
    this.logger.debug(`Reordering ${songIds.length} songs in setlist ${setlistId} for customer ${customerId}`);
    this.logger.debug(`Song IDs to reorder: ${JSON.stringify(songIds)}`);

    // Check if setlist exists and user has permission
    const setlist = await this.findOne(setlistId, customerId);
    this.logger.debug(`Found setlist: ${setlist.name} with ${setlist.songs?.length || 0} songs`);

    // Get current songs in the setlist
    this.logger.debug(`Querying SetlistSong table for setlist ${setlistId}`);
    let currentSetlistSongs = await this.prisma.setlistSong.findMany({
      where: { setlistId },
      include: {
        song: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    this.logger.debug(`Found ${currentSetlistSongs.length} SetlistSong records`);

    // Migration is no longer needed since the old relation doesn't exist

    const currentSongIds = currentSetlistSongs.map(ss => ss.songId);
    this.logger.debug(`Current song IDs: ${JSON.stringify(currentSongIds)}`);

    // Validate that all provided song IDs exist in the setlist
    const missingSongIds = songIds.filter(id => !currentSongIds.includes(id));
    if (missingSongIds.length > 0) {
      throw new BadRequestException(`Songs with IDs ${missingSongIds.join(', ')} are not in the setlist`);
    }

    // Validate that all songs in setlist are included in the reorder
    const extraSongIds = currentSongIds.filter(id => !songIds.includes(id));
    if (extraSongIds.length > 0) {
      throw new BadRequestException(`Reorder must include all songs currently in the setlist. Missing: ${extraSongIds.join(', ')}`);
    }

    // Update positions in a single efficient transaction
    await this.prisma.$transaction(async (tx) => {
      // Use a single updateMany with raw SQL for better performance
      // First, temporarily set all positions to a high number to avoid conflicts
      const tempOffset = 10000;
      await tx.setlistSong.updateMany({
        where: { setlistId },
        data: { position: { increment: tempOffset } },
      });

      // Now update each song to its correct position using batch updates
      const updatePromises = songIds.map((songId, index) =>
        tx.setlistSong.update({
          where: {
            setlistId_songId: {
              setlistId,
              songId,
            },
          },
          data: {
            position: index,
          },
        })
      );

      // Execute all updates in parallel within the transaction
      await Promise.all(updatePromises);

      // Log the reorder activity
      await tx.setlistActivity.create({
        data: {
          setlistId,
          customerId,
          action: 'SONG_REORDERED',
          details: JSON.stringify({
            songIds,
            previousOrder: currentSongIds
          }),
          version: (setlist.version || 0) + 1,
        },
      });

      // Update setlist version
      await tx.setlist.update({
        where: { id: setlistId },
        data: { version: { increment: 1 } },
      });
    });

    this.logger.debug(`Successfully reordered songs in setlist ${setlistId}`);

    // Targeted cache invalidation - only invalidate what's necessary
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    const setlistsCacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    
    await Promise.all([
      this.cacheService.delete(setlistCacheKey),
      this.cacheService.delete(setlistsCacheKey),
    ]);
    
    this.logger.debug(`Invalidated targeted caches for setlist ${setlistId} after reordering`);

    // Return lightweight response with updated version
    const updatedVersion = (setlist.version || 0) + 1;
    return {
      id: setlistId,
      success: true,
      message: 'Songs reordered successfully',
      songOrder: songIds,
      version: updatedVersion,
      timestamp: new Date().toISOString(),
    } as any;
  }

  async remove(id: string, customerId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Hard delete setlist - completely remove from database
    // Note: SetlistSong records will be automatically deleted due to CASCADE
    const deletedSetlist = await this.prisma.setlist.delete({
      where: { id },
      include: {
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
        },
      },
    });

    // Transform for response
    const transformedDeletedSetlist = {
      ...deletedSetlist,
      songs: deletedSetlist.setlistSongs.map(ss => ss.song),
    };
    delete (transformedDeletedSetlist as any).setlistSongs;

    // Invalidate customer's setlists cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after hard deletion`);

    // Also invalidate specific setlist cache if it exists
    const setlistCacheKey = this.cacheService.createKey(CachePrefix.SETLIST, id);
    await this.cacheService.delete(setlistCacheKey);
    this.logger.debug(`Invalidated specific setlist cache for ${id} after hard deletion`);

    // Invalidate all related caches
    await this.cacheService.deleteByPrefix(CachePrefix.SETLISTS);
    this.logger.debug(`Invalidated all setlist caches after deletion of ${id}`);

    return transformedDeletedSetlist;
  }

  // ==================== COLLABORATIVE FEATURES ====================

  /**
   * Generate a unique 4-digit share code for a setlist
   */
  private generateShareCode(): string {
    // Generate a random 4-digit number
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Log activity for a setlist
   */
  private async logActivity(
    setlistId: string,
    customerId: string,
    action: string,
    details?: any,
    version?: number
  ): Promise<void> {
    try {
      await this.prisma.setlistActivity.create({
        data: {
          setlistId,
          customerId,
          action: action as any, // Cast to enum
          details,
          version: version || 1,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error}`);
    }
  }

  /**
   * Check if user has permission to access setlist
   */
  private async checkSetlistAccess(
    setlistId: string,
    customerId: string,
    requiredPermission: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW'
  ): Promise<{ setlist: any; permission: string; isOwner: boolean }> {
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      include: {
        collaborators: {
          where: {
            customerId,
            status: 'ACCEPTED',
          },
        },
      },
    });

    if (!setlist) {
      throw new NotFoundException(`Setlist with ID ${setlistId} not found`);
    }

    const isOwner = setlist.customerId === customerId;
    const collaborator = setlist.collaborators[0];

    if (!isOwner && !collaborator) {
      throw new ForbiddenException('You do not have permission to access this setlist');
    }

    const userPermission = isOwner ? 'ADMIN' : collaborator.permission;

    // Check permission hierarchy: VIEW < EDIT < ADMIN
    const permissionLevels = { VIEW: 1, EDIT: 2, ADMIN: 3 };
    if (permissionLevels[userPermission] < permissionLevels[requiredPermission]) {
      throw new ForbiddenException(`You need ${requiredPermission} permission to perform this action`);
    }

    return { setlist, permission: userPermission, isOwner };
  }

  /**
   * Share a setlist with another user
   */
  async shareSetlist(
    setlistId: string,
    ownerId: string,
    shareDto: ShareSetlistDto
  ): Promise<SetlistCollaboratorResponseDto> {
    // Check if user owns the setlist
    const { setlist, isOwner } = await this.checkSetlistAccess(setlistId, ownerId, 'ADMIN');

    if (!isOwner) {
      throw new ForbiddenException('Only the setlist owner can share it');
    }

    // Find the user to share with
    const targetUser = await this.prisma.customer.findUnique({
      where: { email: shareDto.email },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with email ${shareDto.email} not found`);
    }

    if (targetUser.id === ownerId) {
      throw new BadRequestException('You cannot share a setlist with yourself');
    }

    // Check if already shared with this user
    const existingCollaborator = await this.prisma.setlistCollaborator.findUnique({
      where: {
        setlistId_customerId: {
          setlistId,
          customerId: targetUser.id,
        },
      },
    });

    if (existingCollaborator) {
      throw new ConflictException('Setlist is already shared with this user');
    }

    // Generate share code if not exists
    let shareCode = setlist.shareCode;
    if (!shareCode) {
      shareCode = this.generateShareCode();
      await this.prisma.setlist.update({
        where: { id: setlistId },
        data: {
          shareCode,
          isShared: true,
        },
      });
    }

    // Create collaborator record
    const collaborator = await this.prisma.setlistCollaborator.create({
      data: {
        setlistId,
        customerId: targetUser.id,
        permission: shareDto.permission,
        invitedBy: ownerId,
        status: 'PENDING',
      },
      include: {
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

    // Log activity
    await this.logActivity(setlistId, ownerId, 'COLLABORATOR_ADDED', {
      collaboratorEmail: shareDto.email,
      permission: shareDto.permission,
    });

    // TODO: Send email notification to the invited user
    // await this.emailService.sendSetlistInvitation(targetUser.email, setlist.name, shareCode);

    return {
      id: collaborator.id,
      customer: {
        id: collaborator.customer.id,
        name: collaborator.customer.name,
        email: collaborator.customer.email,
        profilePicture: collaborator.customer.profilePicture || undefined,
      },
      permission: collaborator.permission as any,
      status: collaborator.status as any,
      invitedAt: collaborator.invitedAt,
      acceptedAt: collaborator.acceptedAt,
      lastActiveAt: collaborator.lastActiveAt,
    };
  }

  /**
   * Accept a setlist invitation
   */
  async acceptInvitation(shareCode: string, customerId: string): Promise<SetlistResponseDto> {
    // Find setlist by share code
    const setlist = await this.prisma.setlist.findUnique({
      where: { shareCode },
      include: {
        collaborators: {
          where: {
            customerId,
            status: 'PENDING',
          },
        },
      },
    });

    if (!setlist) {
      throw new NotFoundException('Invalid share code');
    }

    const collaborator = setlist.collaborators[0];
    if (!collaborator) {
      throw new NotFoundException('No pending invitation found for this user');
    }

    // Accept the invitation
    await this.prisma.setlistCollaborator.update({
      where: { id: collaborator.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // Log activity
    await this.logActivity(setlist.id, customerId, 'COLLABORATOR_ADDED', {
      action: 'accepted_invitation',
    });

    // Return the setlist with full details
    return this.getSetlistWithCollaborativeData(setlist.id, customerId);
  }

  /**
   * Get setlist with collaborative data
   */
  private async getSetlistWithCollaborativeData(setlistId: string, customerId: string): Promise<SetlistResponseDto> {
    await this.checkSetlistAccess(setlistId, customerId);

    const fullSetlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      include: {
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        collaborators: {
          where: {
            status: 'ACCEPTED',
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
        },
        activities: {
          take: 10,
          orderBy: {
            timestamp: 'desc',
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
              },
            },
          },
        },
        comments: {
          where: {
            parentId: null,
            isDeleted: false,
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
              },
            },
            replies: {
              where: {
                isDeleted: false,
              },
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    profilePicture: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!fullSetlist) {
      throw new NotFoundException('Setlist not found');
    }

    // Transform setlistSongs to songs for backward compatibility
    const transformedSetlist = {
      ...fullSetlist,
      songs: fullSetlist.setlistSongs.map(ss => ss.song),
    };
    delete (transformedSetlist as any).setlistSongs;

    return {
      ...transformedSetlist,
      collaborators: fullSetlist.collaborators.map(c => ({
        id: c.id,
        customer: {
          id: c.customer.id,
          name: c.customer.name,
          email: c.customer.email,
          profilePicture: c.customer.profilePicture || undefined,
        },
        permission: c.permission as any,
        status: c.status as any,
        invitedAt: c.invitedAt,
        acceptedAt: c.acceptedAt,
        lastActiveAt: c.lastActiveAt,
      })),
      activities: fullSetlist.activities.map(a => ({
        id: a.id,
        customer: {
          id: a.customer.id,
          name: a.customer.name,
          profilePicture: a.customer.profilePicture || undefined,
        },
        action: a.action,
        details: a.details,
        timestamp: a.timestamp,
        version: a.version,
      })),
      comments: fullSetlist.comments.map(c => ({
        id: c.id,
        customer: {
          id: c.customer.id,
          name: c.customer.name,
          profilePicture: c.customer.profilePicture || undefined,
        },
        text: c.text,
        parentId: c.parentId,
        replies: c.replies?.map(r => ({
          id: r.id,
          customer: {
            id: r.customer.id,
            name: r.customer.name,
            profilePicture: r.customer.profilePicture || undefined,
          },
          text: r.text,
          parentId: r.parentId,
          replies: [],
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })) || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    } as SetlistResponseDto;
  }

  /**
   * Update setlist collaboration settings
   */
  async updateSettings(
    setlistId: string,
    customerId: string,
    settingsDto: SetlistSettingsDto
  ): Promise<SetlistResponseDto> {
    // Check if user has admin permission
    const { setlist, isOwner } = await this.checkSetlistAccess(setlistId, customerId, 'ADMIN');

    if (!isOwner) {
      throw new ForbiddenException('Only the setlist owner can update settings');
    }

    // Handle sharing logic
    let updateData: any = { ...settingsDto };

    if (settingsDto.isPublic === true || settingsDto.allowEditing === true) {
      // Enable sharing - generate share code if doesn't exist
      if (!setlist.shareCode) {
        updateData.shareCode = this.generateShareCode();
      }
      updateData.isShared = true;
    } else if (settingsDto.isPublic === false && settingsDto.allowEditing === false) {
      // Disable sharing when both public and editing are false
      updateData.isShared = false;
      // Keep shareCode for potential re-enabling, but mark as not shared
    }

    // Update setlist settings
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: updateData,
      include: {
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        collaborators: {
          where: {
            status: 'ACCEPTED',
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    // Log activity
    await this.logActivity(setlistId, customerId, 'SETTINGS_UPDATED', settingsDto);

    // Invalidate cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(cacheKey);

    // Transform setlistSongs to songs for backward compatibility
    const transformedSetlist = {
      ...updatedSetlist,
      songs: updatedSetlist.setlistSongs.map(ss => ss.song),
    };
    delete (transformedSetlist as any).setlistSongs;

    return {
      ...transformedSetlist,
      collaborators: updatedSetlist.collaborators?.map(c => ({
        id: c.id,
        customer: {
          id: c.customer.id,
          name: c.customer.name,
          email: c.customer.email,
          profilePicture: c.customer.profilePicture || undefined,
        },
        permission: c.permission as any,
        status: c.status as any,
        invitedAt: c.invitedAt,
        acceptedAt: c.acceptedAt,
        lastActiveAt: c.lastActiveAt,
      })),
    } as SetlistResponseDto;
  }

  /**
   * Get setlist by share code (for joining)
   */
  async getSetlistByShareCode(shareCode: string): Promise<SetlistResponseDto> {
    const setlist = await this.prisma.setlist.findUnique({
      where: { shareCode },
      include: {
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!setlist) {
      throw new NotFoundException('Invalid share code or setlist not found');
    }

    // Transform setlistSongs to songs for backward compatibility
    const transformedSetlist = {
      ...setlist,
      songs: setlist.setlistSongs.map(ss => ss.song),
    };
    delete (transformedSetlist as any).setlistSongs;

    return transformedSetlist as SetlistResponseDto;
  }

  /**
   * Join setlist by share code
   */
  async joinSetlist(shareCode: string, customerId: string): Promise<SetlistResponseDto> {
    // Find setlist by share code
    const setlist = await this.prisma.setlist.findUnique({
      where: { shareCode },
    });

    if (!setlist) {
      throw new NotFoundException('Invalid share code or setlist not found');
    }

    // Check if user is already a collaborator
    const existingCollaborator = await this.prisma.setlistCollaborator.findUnique({
      where: {
        setlistId_customerId: {
          setlistId: setlist.id,
          customerId,
        },
      },
    });

    if (existingCollaborator) {
      if (existingCollaborator.status === 'ACCEPTED') {
        throw new ConflictException('You are already a member of this setlist');
      } else if (existingCollaborator.status === 'PENDING') {
        // Accept pending invitation
        await this.prisma.setlistCollaborator.update({
          where: { id: existingCollaborator.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            lastActiveAt: new Date(),
          },
        });
      }
    } else {
      // Create new collaborator with VIEW permission by default
      await this.prisma.setlistCollaborator.create({
        data: {
          setlistId: setlist.id,
          customerId,
          permission: 'VIEW',
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          lastActiveAt: new Date(),
          invitedBy: setlist.customerId, // Set the setlist owner as the inviter
        },
      });
    }

    // Log activity
    await this.logActivity(setlist.id, customerId, 'COLLABORATOR_JOINED', {
      joinedViaShareCode: shareCode,
    });

    // Return the setlist with collaborative data
    return this.getSetlistWithCollaborativeData(setlist.id, customerId);
  }

  /**
   * Get all setlists shared with the current user
   */
  async getSharedSetlists(customerId: string): Promise<SetlistResponseDto[]> {
    const collaborations = await this.prisma.setlistCollaborator.findMany({
      where: {
        customerId,
        status: 'ACCEPTED',
      },
      include: {
        setlist: {
          include: {
            setlistSongs: {
              include: {
                song: {
                  include: {
                    artist: true,
                  },
                },
              },
              orderBy: {
                position: 'asc',
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return collaborations.map(c => {
      // Transform setlistSongs to songs for backward compatibility
      const transformedSetlist = {
        ...c.setlist,
        songs: c.setlist.setlistSongs.map(ss => ss.song),
      };
      delete (transformedSetlist as any).setlistSongs;
      return transformedSetlist as SetlistResponseDto;
    });
  }

  /**
   * Get collaborators for a setlist
   */
  async getCollaborators(setlistId: string, customerId: string): Promise<SetlistCollaboratorResponseDto[]> {
    // Check if user has access to view collaborators
    await this.checkSetlistAccess(setlistId, customerId, 'VIEW');

    const collaborators = await this.prisma.setlistCollaborator.findMany({
      where: { setlistId },
      include: {
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

    return collaborators.map(c => ({
      id: c.id,
      customer: {
        id: c.customer.id,
        name: c.customer.name,
        email: c.customer.email,
        profilePicture: c.customer.profilePicture || undefined,
      },
      permission: c.permission as any,
      status: c.status as any,
      invitedAt: c.invitedAt,
      acceptedAt: c.acceptedAt,
      lastActiveAt: c.lastActiveAt,
    }));
  }

  /**
   * Update collaborator permissions
   */
  async updateCollaborator(
    setlistId: string,
    customerId: string,
    collaboratorId: string,
    updateDto: any
  ): Promise<SetlistCollaboratorResponseDto> {
    // Check if user has admin permission
    await this.checkSetlistAccess(setlistId, customerId, 'ADMIN');

    const collaborator = await this.prisma.setlistCollaborator.update({
      where: { id: collaboratorId },
      data: updateDto,
      include: {
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
      id: collaborator.id,
      customer: {
        id: collaborator.customer.id,
        name: collaborator.customer.name,
        email: collaborator.customer.email,
        profilePicture: collaborator.customer.profilePicture || undefined,
      },
      permission: collaborator.permission as any,
      status: collaborator.status as any,
      invitedAt: collaborator.invitedAt,
      acceptedAt: collaborator.acceptedAt,
      lastActiveAt: collaborator.lastActiveAt,
    };
  }

  /**
   * Remove collaborator from setlist
   */
  async removeCollaborator(setlistId: string, customerId: string, collaboratorId: string): Promise<void> {
    // Check if user has admin permission
    await this.checkSetlistAccess(setlistId, customerId, 'ADMIN');

    await this.prisma.setlistCollaborator.delete({
      where: { id: collaboratorId },
    });
  }

  /**
   * Get setlist activities
   */
  async getActivities(setlistId: string, customerId: string, limit: number = 50): Promise<any[]> {
    // Check if user has access
    await this.checkSetlistAccess(setlistId, customerId, 'VIEW');

    const activities = await this.prisma.setlistActivity.findMany({
      where: { setlistId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return activities;
  }

  /**
   * Add comment to setlist
   */
  async addComment(setlistId: string, customerId: string, commentDto: any): Promise<any> {
    // Check if user has access
    await this.checkSetlistAccess(setlistId, customerId, 'VIEW');

    const comment = await this.prisma.setlistComment.create({
      data: {
        setlistId,
        customerId,
        text: commentDto.text,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return comment;
  }

  /**
   * Get setlist comments
   */
  async getComments(setlistId: string, customerId: string): Promise<any[]> {
    // Check if user has access
    await this.checkSetlistAccess(setlistId, customerId, 'VIEW');

    const comments = await this.prisma.setlistComment.findMany({
      where: { setlistId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments;
  }

  /**
   * Sync setlist (placeholder for real-time sync)
   */
  async syncSetlist(setlistId: string, customerId: string, _syncDto: any): Promise<SetlistResponseDto> {
    // Check if user has access
    await this.checkSetlistAccess(setlistId, customerId, 'VIEW');

    // For now, just return the current setlist
    // In the future, this would handle real-time synchronization
    return this.getSetlistWithCollaborativeData(setlistId, customerId);
  }

  // Community Features

  async makePublic(setlistId: string, customerId: string): Promise<SetlistResponseDto> {
    // Check if user owns the setlist
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      select: { customerId: true, isPublic: true },
    });

    if (!setlist) {
      throw new NotFoundException('Setlist not found');
    }

    if (setlist.customerId !== customerId) {
      throw new ForbiddenException('Only the owner can make a setlist public');
    }

    if (setlist.isPublic) {
      throw new ConflictException('Setlist is already public');
    }

    // Update setlist to be public
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: {
        isPublic: true,
        sharedAt: new Date(),
      },
      include: {
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    // Invalidate cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(cacheKey);

    // Also invalidate customer's setlists cache
    const setlistsCacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(setlistsCacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after making public`);

    this.logger.log(`Setlist ${setlistId} made public by customer ${customerId}`);

    // Transform setlistSongs to songs for backward compatibility
    const transformedSetlist = {
      ...updatedSetlist,
      songs: updatedSetlist.setlistSongs.map(ss => ss.song),
    };
    delete (transformedSetlist as any).setlistSongs;

    return transformedSetlist;
  }

  async makePrivate(setlistId: string, customerId: string): Promise<SetlistResponseDto> {
    // Check if user owns the setlist
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      select: { customerId: true, isPublic: true },
    });

    if (!setlist) {
      throw new NotFoundException('Setlist not found');
    }

    if (setlist.customerId !== customerId) {
      throw new ForbiddenException('Only the owner can make a setlist private');
    }

    if (!setlist.isPublic) {
      throw new ConflictException('Setlist is already private');
    }

    // Update setlist to be private
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: {
        isPublic: false,
        sharedAt: null,
      },
      include: {
        setlistSongs: {
          include: {
            song: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    // Invalidate cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(cacheKey);

    // Also invalidate customer's setlists cache
    const setlistsCacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
    await this.cacheService.delete(setlistsCacheKey);
    this.logger.debug(`Invalidated setlists cache for customer ${customerId} after making private`);

    this.logger.log(`Setlist ${setlistId} made private by customer ${customerId}`);

    // Transform setlistSongs to songs for backward compatibility
    const transformedSetlist = {
      ...updatedSetlist,
      songs: updatedSetlist.setlistSongs.map(ss => ss.song),
    };
    delete (transformedSetlist as any).setlistSongs;

    return transformedSetlist;
  }

  async likeSetlist(setlistId: string, customerId: string): Promise<{ success: boolean; likeCount: number }> {
    // Check if setlist exists and is public
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      select: { isPublic: true, likeCount: true },
    });

    if (!setlist) {
      throw new NotFoundException('Setlist not found');
    }

    if (!setlist.isPublic) {
      throw new ForbiddenException('Can only like public setlists');
    }

    // Check if already liked
    const existingLike = await this.prisma.setlistLike.findUnique({
      where: {
        setlistId_customerId: {
          setlistId,
          customerId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('Already liked this setlist');
    }

    // Create like and increment count
    await this.prisma.$transaction(async (tx) => {
      await tx.setlistLike.create({
        data: {
          setlistId,
          customerId,
        },
      });

      await tx.setlist.update({
        where: { id: setlistId },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });
    });

    const newLikeCount = setlist.likeCount + 1;

    // Invalidate cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(cacheKey);

    this.logger.log(`Setlist ${setlistId} liked by customer ${customerId}`);
    return { success: true, likeCount: newLikeCount };
  }

  async unlikeSetlist(setlistId: string, customerId: string): Promise<{ success: boolean; likeCount: number }> {
    // Check if setlist exists
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      select: { likeCount: true },
    });

    if (!setlist) {
      throw new NotFoundException('Setlist not found');
    }

    // Check if liked
    const existingLike = await this.prisma.setlistLike.findUnique({
      where: {
        setlistId_customerId: {
          setlistId,
          customerId,
        },
      },
    });

    if (!existingLike) {
      throw new ConflictException('Not liked this setlist');
    }

    // Remove like and decrement count
    await this.prisma.$transaction(async (tx) => {
      await tx.setlistLike.delete({
        where: {
          setlistId_customerId: {
            setlistId,
            customerId,
          },
        },
      });

      await tx.setlist.update({
        where: { id: setlistId },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });
    });

    const newLikeCount = Math.max(0, setlist.likeCount - 1);

    // Invalidate cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(cacheKey);

    this.logger.log(`Setlist ${setlistId} unliked by customer ${customerId}`);
    return { success: true, likeCount: newLikeCount };
  }

  async incrementViewCount(setlistId: string, customerId: string): Promise<{ success: boolean; viewCount: number }> {
    // Check if setlist exists and is public
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      select: { isPublic: true, viewCount: true, customerId: true },
    });

    if (!setlist) {
      throw new NotFoundException('Setlist not found');
    }

    if (!setlist.isPublic) {
      throw new ForbiddenException('Can only view public setlists');
    }

    // Don't increment view count for own setlists
    if (setlist.customerId === customerId) {
      return { success: true, viewCount: setlist.viewCount };
    }

    // Increment view count
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: { viewCount: true },
    });

    // Invalidate cache
    const cacheKey = this.cacheService.createKey(CachePrefix.SETLIST, setlistId);
    await this.cacheService.delete(cacheKey);

    this.logger.log(`Setlist ${setlistId} view count incremented by customer ${customerId}`);
    return { success: true, viewCount: updatedSetlist.viewCount };
  }

  /**
   * Clear all setlist-related caches for a user
   * This is useful for debugging cache issues and forcing fresh data
   */
  async clearUserCaches(customerId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.debug(`Clearing all setlist caches for customer ${customerId}`);

      // Clear user's setlists list cache
      const setlistsCacheKey = this.cacheService.createKey(CachePrefix.SETLISTS, customerId);
      await this.cacheService.delete(setlistsCacheKey);

      // Clear all setlist list caches (with different filters)
      await this.cacheService.deleteByPrefix(CachePrefix.SETLISTS);

      // Clear all individual setlist caches
      await this.cacheService.deleteByPrefix(CachePrefix.SETLIST);

      this.logger.log(`Successfully cleared all setlist caches for customer ${customerId}`);

      return {
        success: true,
        message: 'All setlist caches cleared successfully'
      };
    } catch (error: any) {
      this.logger.error(`Error clearing caches for customer ${customerId}: ${error.message}`);
      return {
        success: false,
        message: `Failed to clear caches: ${error.message}`
      };
    }
  }
}
