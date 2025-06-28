import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CommunitySetlistsResponseDto, CommunitySetlistDto } from '../dto/community.dto';

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
            songs: {
              take: 3, // Preview of first 3 songs
              select: {
                id: true,
                title: true,
                artist: true,
                key: true,
              },
            },
            likes: {
              where: { customerId },
              select: { id: true },
            },
            _count: {
              select: { songs: true },
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
        songCount: setlist._count.songs,
        viewCount: setlist.viewCount,
        likeCount: setlist.likeCount,
        isLikedByUser: setlist.likes.length > 0,
        sharedAt: setlist.sharedAt?.toISOString() || setlist.createdAt.toISOString(),
        createdAt: setlist.createdAt.toISOString(),
        updatedAt: setlist.updatedAt.toISOString(),
        songPreview: setlist.songs.map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist.name,
          key: song.key ?? undefined,
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
          songs: {
            take: 3,
            select: {
              id: true,
              title: true,
              artist: true,
              key: true,
            },
          },
          likes: {
            where: { customerId },
            select: { id: true },
          },
          _count: {
            select: { songs: true },
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
        songCount: setlist._count.songs,
        viewCount: setlist.viewCount,
        likeCount: setlist.likeCount,
        isLikedByUser: setlist.likes.length > 0,
        sharedAt: setlist.sharedAt?.toISOString() || setlist.createdAt.toISOString(),
        createdAt: setlist.createdAt.toISOString(),
        updatedAt: setlist.updatedAt.toISOString(),
        songPreview: setlist.songs.map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist.name,
          key: song.key ?? undefined,
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
                songs: {
                  take: 3,
                  select: {
                    id: true,
                    title: true,
                    artist: true,
                    key: true,
                  },
                },
                _count: {
                  select: { songs: true },
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
        songCount: like.setlist._count.songs,
        viewCount: like.setlist.viewCount,
        likeCount: like.setlist.likeCount,
        isLikedByUser: true, // Always true for liked setlists
        sharedAt: like.setlist.sharedAt?.toISOString() || like.setlist.createdAt.toISOString(),
        createdAt: like.setlist.createdAt.toISOString(),
        updatedAt: like.setlist.updatedAt.toISOString(),
        songPreview: like.setlist.songs.map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist.name,
          key: song.key ?? undefined,
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
}
