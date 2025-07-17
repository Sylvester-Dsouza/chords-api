import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CommunitySetlistsResponseDto, CommunitySetlistDto } from '../dto/community-setlist.dto';
import { SetlistResponseDto, SetlistCollaboratorResponseDto } from '../dto/setlist.dto';

interface GetCommunitySetlistsParams {
  page: number;
  limit: number;
  sortBy: 'newest' | 'oldest' | 'mostLiked' | 'mostViewed';
  search?: string;
  customerId: string;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(private prisma: PrismaService) {}
  
  /**
   * Helper method to transform Prisma setlist result to SetlistResponseDto
   */
  private transformToSetlistResponseDto(setlist: any): SetlistResponseDto {
    // Convert dates to ISO strings and properly format collaborators
    const formattedSetlist: SetlistResponseDto = {
      id: setlist.id,
      name: setlist.name,
      description: setlist.description,
      customerId: setlist.customerId,
      createdAt: setlist.createdAt,
      updatedAt: setlist.updatedAt,
      isPublic: setlist.isPublic,
      isShared: setlist.isShared,
      shareCode: setlist.shareCode,
      allowEditing: setlist.allowEditing,
      allowComments: setlist.allowComments,
      version: setlist.version,
      songs: setlist.songs,
      // Need to manually transform the collaborators to match the expected DTO format
      collaborators: setlist.collaborators.map((collab: any) => {
        // Create a properly formatted collaborator object that matches SetlistCollaboratorResponseDto
        return {
          id: collab.id,
          status: collab.status,
          permission: collab.permission,
          invitedAt: typeof collab.invitedAt === 'string' ? collab.invitedAt : collab.invitedAt.toISOString(),
          acceptedAt: collab.acceptedAt ? (typeof collab.acceptedAt === 'string' ? collab.acceptedAt : collab.acceptedAt.toISOString()) : null,
          lastActiveAt: collab.lastActiveAt ? (typeof collab.lastActiveAt === 'string' ? collab.lastActiveAt : collab.lastActiveAt.toISOString()) : null,
          customer: {
            id: collab.customer.id,
            name: collab.customer.name,
            email: collab.customer.email || '', // Use email if available, otherwise empty string
            profilePicture: collab.customer.profilePicture || undefined
          }
        };
      })
    };
    
    return formattedSetlist;
  }

  async getCommunitySetlists(params: GetCommunitySetlistsParams): Promise<CommunitySetlistsResponseDto> {
    const { page, limit, sortBy, search, customerId } = params;
    const skip = (page - 1) * limit;

    try {
      // Build where clause
      const whereClause: any = {
        isPublic: true,
        isDeleted: false,
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build order by clause
      let orderBy: any = {};
      switch (sortBy) {
        case 'newest':
          orderBy = { sharedAt: 'desc' };
          break;
        case 'oldest':
          orderBy = { sharedAt: 'asc' };
          break;
        case 'mostLiked':
          orderBy = { likeCount: 'desc' };
          break;
        case 'mostViewed':
          orderBy = { viewCount: 'desc' };
          break;
        default:
          orderBy = { sharedAt: 'desc' };
      }

      // Get setlists with creator info and song count
      const [setlists, total] = await Promise.all([
        this.prisma.setlist.findMany({
          where: whereClause,
          orderBy,
          skip,
          take: limit,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
              },
            },
            setlistSongs: {
              take: 3, // Preview of first 3 songs
              orderBy: {
                position: 'asc',
              },
              select: {
                song: {
                  select: {
                    id: true,
                    title: true,
                    artist: {
                      select: {
                        name: true,
                      },
                    },
                    key: true,
                  },
                },
              },
            },
            likes: {
              where: { customerId },
              select: { id: true },
            },
            _count: {
              select: { setlistSongs: true },
            },
          },
        }),
        this.prisma.setlist.count({ where: whereClause }),
      ]);

      // Transform to DTO
      const communitySetlists: CommunitySetlistDto[] = setlists.map(setlist => ({
        id: setlist.id,
        name: setlist.name,
        description: setlist.description ?? undefined,
        creator: {
          id: setlist.customer.id,
          name: setlist.customer.name,
          profilePicture: setlist.customer.profilePicture ?? undefined,
        },
        songCount: setlist._count.setlistSongs,
        viewCount: setlist.viewCount,
        likeCount: setlist.likeCount,
        isLikedByUser: setlist.likes.length > 0,
        sharedAt: setlist.sharedAt?.toISOString() || setlist.createdAt.toISOString(),
        createdAt: setlist.createdAt.toISOString(),
        updatedAt: setlist.updatedAt.toISOString(),
        songPreview: setlist.setlistSongs.map(ss => ({
          id: ss.song.id,
          title: ss.song.title,
          artist: ss.song.artist.name,
          key: ss.song.key ?? undefined,
        })),
      }));

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        setlists: communitySetlists,
        total,
        page,
        limit,
        totalPages,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Error fetching community setlists:', error);
      throw error;
    }
  }

  async getTrendingSetlists(limit: number, customerId: string): Promise<CommunitySetlistsResponseDto> {
    try {
      // Get trending setlists (most liked + viewed in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const setlists = await this.prisma.setlist.findMany({
        where: {
          isPublic: true,
          isDeleted: false,
          sharedAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: [
          { likeCount: 'desc' },
          { viewCount: 'desc' },
        ],
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
            },
          },
          setlistSongs: {
            take: 3,
            orderBy: {
              position: 'asc',
            },
            select: {
              song: {
                select: {
                  id: true,
                  title: true,
                  artist: {
                    select: {
                      name: true,
                    },
                  },
                  key: true,
                },
              },
            },
          },
          likes: {
            where: { customerId },
            select: { id: true },
          },
          _count: {
            select: { setlistSongs: true },
          },
        },
      });

      const communitySetlists: CommunitySetlistDto[] = setlists.map(setlist => ({
        id: setlist.id,
        name: setlist.name,
        description: setlist.description ?? undefined,
        creator: {
          id: setlist.customer.id,
          name: setlist.customer.name,
          profilePicture: setlist.customer.profilePicture ?? undefined,
        },
        songCount: setlist._count.setlistSongs,
        viewCount: setlist.viewCount,
        likeCount: setlist.likeCount,
        isLikedByUser: setlist.likes.length > 0,
        sharedAt: setlist.sharedAt?.toISOString() || setlist.createdAt.toISOString(),
        createdAt: setlist.createdAt.toISOString(),
        updatedAt: setlist.updatedAt.toISOString(),
        songPreview: setlist.setlistSongs.map(ss => ({
          id: ss.song.id,
          title: ss.song.title,
          artist: ss.song.artist.name,
          key: ss.song.key ?? undefined,
        })),
      }));

      return {
        setlists: communitySetlists,
        total: setlists.length,
        page: 1,
        limit,
        totalPages: 1,
        hasMore: false,
      };
    } catch (error) {
      this.logger.error('Error fetching trending setlists:', error);
      throw error;
    }
  }

  async getMyLikedSetlists(customerId: string, page: number, limit: number): Promise<CommunitySetlistsResponseDto> {
    const skip = (page - 1) * limit;

    try {
      const [likedSetlists, total] = await Promise.all([
        this.prisma.setlistLike.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            setlist: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    profilePicture: true,
                  },
                },
                setlistSongs: {
                  take: 3,
                  orderBy: {
                    position: 'asc',
                  },
                  select: {
                    song: {
                      select: {
                        id: true,
                        title: true,
                        artist: {
                          select: {
                            name: true,
                          },
                        },
                        key: true,
                      },
                    },
                  },
                },
                _count: {
                  select: { setlistSongs: true },
                },
              },
            },
          },
        }),
        this.prisma.setlistLike.count({ where: { customerId } }),
      ]);

      const communitySetlists: CommunitySetlistDto[] = likedSetlists.map(like => ({
        id: like.setlist.id,
        name: like.setlist.name,
        description: like.setlist.description ?? undefined,
        creator: {
          id: like.setlist.customer.id,
          name: like.setlist.customer.name,
          profilePicture: like.setlist.customer.profilePicture ?? undefined,
        },
        songCount: like.setlist._count.setlistSongs,
        viewCount: like.setlist.viewCount,
        likeCount: like.setlist.likeCount,
        isLikedByUser: true, // Always true for liked setlists
        sharedAt: like.setlist.sharedAt?.toISOString() || like.setlist.createdAt.toISOString(),
        createdAt: like.setlist.createdAt.toISOString(),
        updatedAt: like.setlist.updatedAt.toISOString(),
        songPreview: like.setlist.setlistSongs.map(ss => ({
          id: ss.song.id,
          title: ss.song.title,
          artist: ss.song.artist.name,
          key: ss.song.key ?? undefined,
        })),
      }));

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        setlists: communitySetlists,
        total,
        page,
        limit,
        totalPages,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Error fetching liked setlists:', error);
      throw error;
    }
  }

  /**
   * Add a song from a community setlist to a user's own setlist
   * This method bypasses the normal permission check in SetlistService.addSong
   * by directly verifying that the target setlist belongs to the user
   */
  async addSongToUserSetlist(
    songId: string,
    targetSetlistId: string,
    customerId: string
  ): Promise<SetlistResponseDto> {
    try {
      this.logger.log(`Adding song ${songId} to setlist ${targetSetlistId} for user ${customerId}`);
      
      // Verify the song exists
      const song = await this.prisma.song.findUnique({
        where: { id: songId },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${songId} not found`);
      }

      // Verify the target setlist exists and belongs to the user
      const targetSetlist = await this.prisma.setlist.findUnique({
        where: { id: targetSetlistId },
        include: {
          setlistSongs: {
            include: {
              song: true,
            },
          },
          collaborators: {
            where: { customerId },
          },
        },
      });

      if (!targetSetlist) {
        throw new NotFoundException(`Setlist with ID ${targetSetlistId} not found`);
      }

      // Check if the user has permission to modify this setlist
      const isOwner = targetSetlist.customerId === customerId;
      const hasEditPermission = targetSetlist.collaborators.some(c => 
        ['EDIT', 'ADMIN'].includes(c.permission)
      );

      if (!isOwner && !hasEditPermission) {
        throw new ForbiddenException('You do not have permission to modify this setlist');
      }

      // Check if song is already in the setlist
      const existingSetlistSong = await this.prisma.setlistSong.findUnique({
        where: {
          setlistId_songId: {
            setlistId: targetSetlistId,
            songId,
          },
        },
      });

      if (existingSetlistSong) {
        throw new BadRequestException(`Song with ID ${songId} is already in the setlist`);
      }

      // Get the next position (max position + 1)
      const maxPosition = await this.prisma.setlistSong.aggregate({
        where: { setlistId: targetSetlistId },
        _max: { position: true },
      });

      const nextPosition = (maxPosition._max.position ?? -1) + 1;

      // Add song to setlist using SetlistSong junction table
      await this.prisma.setlistSong.create({
        data: {
          setlistId: targetSetlistId,
          songId,
          position: nextPosition,
          addedBy: customerId,
        },
      });

      // Get updated setlist with proper structure
      const updatedSetlist = await this.prisma.setlist.findUnique({
        where: { id: targetSetlistId },
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
      });

      // Transform for backward compatibility
      const transformedSetlist = {
        ...updatedSetlist,
        songs: updatedSetlist?.setlistSongs?.map(ss => ss.song) || [],
      };
      delete (transformedSetlist as any).setlistSongs;

      // Log activity
      await this.prisma.setlistActivity.create({
        data: {
          setlistId: targetSetlistId,
          customerId,
          action: 'SONG_ADDED',
          details: JSON.stringify({ songId }),
          version: 1, // Required field
        },
      });

      return this.transformToSetlistResponseDto(transformedSetlist);
    } catch (error: any) {
      this.logger.error(`Error adding song to setlist: ${error.message || 'Unknown error'}`, error.stack);
      throw error;
    }
  }

  /**
   * Add multiple songs from a community setlist to a user's own setlist
   * This method bypasses the normal permission check in SetlistService.addMultipleSongs
   * by directly verifying that the target setlist belongs to the user
   */
  async addMultipleSongsToUserSetlist(
    songIds: string[],
    targetSetlistId: string,
    customerId: string
  ): Promise<SetlistResponseDto> {
    try {
      this.logger.log(`Adding ${songIds.length} songs to setlist ${targetSetlistId} for user ${customerId}`);
      
      if (!songIds.length) {
        throw new BadRequestException('No songs provided to add');
      }

      // Verify the songs exist
      const songs = await this.prisma.song.findMany({
        where: { id: { in: songIds } },
      });

      if (songs.length !== songIds.length) {
        throw new NotFoundException('One or more songs not found');
      }

      // Verify the target setlist exists and belongs to the user
      const targetSetlist = await this.prisma.setlist.findUnique({
        where: { id: targetSetlistId },
        include: {
          setlistSongs: {
            include: {
              song: true,
            },
          },
          collaborators: {
            where: { customerId },
          },
        },
      });

      if (!targetSetlist) {
        throw new NotFoundException(`Setlist with ID ${targetSetlistId} not found`);
      }

      // Check if the user has permission to modify this setlist
      const isOwner = targetSetlist.customerId === customerId;
      const hasEditPermission = targetSetlist.collaborators.some(c => 
        ['EDIT', 'ADMIN'].includes(c.permission)
      );

      if (!isOwner && !hasEditPermission) {
        throw new ForbiddenException('You do not have permission to modify this setlist');
      }

      // Get existing song IDs in the setlist
      const existingSetlistSongs = await this.prisma.setlistSong.findMany({
        where: { setlistId: targetSetlistId },
        select: { songId: true },
      });
      const existingSongIds = existingSetlistSongs.map(ss => ss.songId);

      // Filter out songs that are already in the setlist
      const newSongIds = songIds.filter(id => !existingSongIds.includes(id));

      if (!newSongIds.length) {
        throw new BadRequestException('All songs are already in the setlist');
      }

      // Get the current max position
      const maxPosition = await this.prisma.setlistSong.aggregate({
        where: { setlistId: targetSetlistId },
        _max: { position: true },
      });

      const startPosition = (maxPosition._max.position ?? -1) + 1;

      // Create SetlistSong records for all new songs
      const setlistSongData = newSongIds.map((songId, index) => ({
        setlistId: targetSetlistId,
        songId,
        position: startPosition + index,
        addedBy: customerId,
      }));

      await this.prisma.setlistSong.createMany({
        data: setlistSongData,
      });

      // Get updated setlist with proper structure
      const updatedSetlist = await this.prisma.setlist.findUnique({
        where: { id: targetSetlistId },
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
      });

      // Transform for backward compatibility
      const transformedSetlist = {
        ...updatedSetlist,
        songs: updatedSetlist?.setlistSongs?.map(ss => ss.song) || [],
      };
      delete (transformedSetlist as any).setlistSongs;

      // Log activity
      await this.prisma.setlistActivity.create({
        data: {
          setlistId: targetSetlistId,
          customerId,
          action: 'SONG_ADDED', // Using SONG_ADDED as SONGS_ADDED is not a valid enum value
          details: JSON.stringify({ songIds: newSongIds }),
          version: 1, // Required field
        },
      });

      return this.transformToSetlistResponseDto(transformedSetlist);
    } catch (error: any) {
      this.logger.error(`Error adding multiple songs to setlist: ${error.message || 'Unknown error'}`, error.stack);
      throw error;
    }
  }
}
