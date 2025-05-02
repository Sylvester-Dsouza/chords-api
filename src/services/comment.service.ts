import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCommentDto, UpdateCommentDto, CommentLikeResponseDto } from '../dto/comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, createCommentDto: CreateCommentDto): Promise<any> {
    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: createCommentDto.songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${createCommentDto.songId} not found`);
    }

    // If this is a reply, check if parent comment exists
    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException(`Parent comment with ID ${createCommentDto.parentId} not found`);
      }

      // Ensure parent comment belongs to the same song
      if (parentComment.songId !== createCommentDto.songId) {
        throw new BadRequestException('Parent comment does not belong to the specified song');
      }

      // Ensure we're not replying to a reply (only one level of nesting)
      if (parentComment.parentId) {
        throw new BadRequestException('Cannot reply to a reply. Please reply to the original comment.');
      }
    }

    // Create the comment
    const comment = await this.prisma.comment.create({
      data: {
        text: createCommentDto.text,
        song: {
          connect: { id: createCommentDto.songId },
        },
        customer: {
          connect: { id: customerId },
        },
        ...(createCommentDto.parentId && {
          parent: {
            connect: { id: createCommentDto.parentId },
          },
        }),
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
    });

    return {
      ...comment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async findAllForSong(songId: string, customerId?: string): Promise<any[]> {
    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Get top-level comments (not replies)
    const comments = await this.prisma.comment.findMany({
      where: {
        songId,
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
            likes: true,
            _count: {
              select: {
                likes: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to include likesCount and isLiked
    return comments.map(comment => {
      const likesCount = comment._count.likes;
      const isLiked = customerId ? comment.likes.some(like => like.customerId === customerId) : false;

      return {
        ...comment,
        likesCount,
        isLiked,
        replies: comment.replies.map(reply => {
          const replyLikesCount = reply._count.likes;
          const replyIsLiked = customerId ? reply.likes.some(like => like.customerId === customerId) : false;

          return {
            ...reply,
            likesCount: replyLikesCount,
            isLiked: replyIsLiked,
            replies: [], // Replies to replies are not supported
          };
        }),
      };
    });
  }

  async findOne(id: string, customerId?: string): Promise<any> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
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
            likes: true,
            _count: {
              select: {
                likes: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    const likesCount = comment._count.likes;
    const isLiked = customerId ? comment.likes.some(like => like.customerId === customerId) : false;

    return {
      ...comment,
      likesCount,
      isLiked,
      replies: comment.replies.map(reply => {
        const replyLikesCount = reply._count.likes;
        const replyIsLiked = customerId ? reply.likes.some(like => like.customerId === customerId) : false;

        return {
          ...reply,
          likesCount: replyLikesCount,
          isLiked: replyIsLiked,
          replies: [], // Replies to replies are not supported
        };
      }),
    };
  }

  async update(id: string, customerId: string, updateCommentDto: UpdateCommentDto): Promise<any> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Check if the user is the owner of the comment
    if (comment.customerId !== customerId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    // Update the comment
    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        text: updateCommentDto.text,
        updatedAt: new Date(),
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
            likes: true,
            _count: {
              select: {
                likes: true,
              },
            },
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    const likesCount = updatedComment._count.likes;
    const isLiked = updatedComment.likes.some(like => like.customerId === customerId);

    return {
      ...updatedComment,
      likesCount,
      isLiked,
      replies: updatedComment.replies.map(reply => {
        const replyLikesCount = reply._count.likes;
        const replyIsLiked = reply.likes.some(like => like.customerId === customerId);

        return {
          ...reply,
          likesCount: replyLikesCount,
          isLiked: replyIsLiked,
          replies: [], // Replies to replies are not supported
        };
      }),
    };
  }

  async softDelete(id: string, customerId: string): Promise<any> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Check if the user is the owner of the comment
    if (comment.customerId !== customerId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Soft delete the comment
    const deletedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        text: 'This comment has been deleted',
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
    });

    return {
      ...deletedComment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async likeComment(commentId: string, customerId: string): Promise<CommentLikeResponseDto> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check if already liked
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_customerId: {
          commentId,
          customerId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException(`Comment with ID ${commentId} is already liked`);
    }

    // Create the like
    const like = await this.prisma.commentLike.create({
      data: {
        comment: {
          connect: { id: commentId },
        },
        customer: {
          connect: { id: customerId },
        },
      },
    });

    return like;
  }

  async unlikeComment(commentId: string, customerId: string): Promise<void> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check if liked
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_customerId: {
          commentId,
          customerId,
        },
      },
    });

    if (!existingLike) {
      throw new BadRequestException(`Comment with ID ${commentId} is not liked`);
    }

    // Delete the like
    await this.prisma.commentLike.delete({
      where: {
        commentId_customerId: {
          commentId,
          customerId,
        },
      },
    });
  }

  // Admin methods for comment management
  async findAllWithFilters(filters: {
    page?: number;
    limit?: number;
    songId?: string;
    customerId?: string;
    search?: string;
    isDeleted?: boolean;
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
      search,
      isDeleted,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build where clause based on filters
    const where: any = {};

    if (songId) {
      where.songId = songId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (isDeleted !== undefined) {
      where.isDeleted = isDeleted;
    }

    // Moderation has been removed

    if (search) {
      where.text = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate),
      };
    }

    // Count total comments matching filters
    const totalComments = await this.prisma.comment.count({ where });

    // Get comments with pagination
    const comments = await this.prisma.comment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
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
            _count: {
              select: {
                likes: true,
              },
            },
          },
          take: 3, // Only include a few replies for preview
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Transform comments to include counts
    const transformedComments = comments.map(comment => {
      return {
        ...comment,
        likesCount: comment._count.likes,
        repliesCount: comment._count.replies,
        replies: comment.replies.map(reply => ({
          ...reply,
          likesCount: reply._count.likes,
          replies: [],
        })),
      };
    });

    return {
      data: transformedComments,
      total: totalComments,
      page,
      limit,
      totalPages: Math.ceil(totalComments / limit),
    };
  }

  async findOneWithDetails(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
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
        replies: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
              },
            },
            likes: true,
            _count: {
              select: {
                likes: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        likes: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return {
      ...comment,
      likesCount: comment._count.likes,
      replies: comment.replies.map(reply => ({
        ...reply,
        likesCount: reply._count.likes,
      })),
    };
  }

  async replyAsAdmin(commentId: string, adminId: string, text: string) {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Get admin information
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${adminId} not found`);
    }

    // Find or create a system customer account for admin replies
    let systemCustomer = await this.prisma.customer.findFirst({
      where: {
        email: 'admin@system.com',
      },
    });

    if (!systemCustomer) {
      // Create a system customer if it doesn't exist
      systemCustomer = await this.prisma.customer.create({
        data: {
          name: 'System Admin',
          email: 'admin@system.com',
          isActive: true,
          isEmailVerified: true,
          termsAccepted: true,
          termsAcceptedAt: new Date(),
        },
      });
    }

    // Create admin reply with the system customer account
    const reply = await this.prisma.comment.create({
      data: {
        // Add admin name to the text
        text: `[Admin: ${admin.name}] ${text}`,
        song: {
          connect: { id: comment.songId },
        },
        customer: {
          connect: { id: systemCustomer.id },
        },
        parent: {
          connect: { id: commentId },
        },
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
    });

    return {
      ...reply,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async adminDelete(id: string) {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Soft delete the comment
    const deletedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        text: 'This comment has been removed by an administrator',
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
    });

    return {
      ...deletedComment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async adminRestore(id: string) {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Restore the comment
    const restoredComment = await this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
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
    });

    return {
      ...restoredComment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async getCommentStats() {
    // Get total comments count
    const totalComments = await this.prisma.comment.count();

    // Get new comments from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newCommentsToday = await this.prisma.comment.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    // Moderation has been removed
    const pendingComments = 0;
    const flaggedComments = 0;

    // Get most active song
    const songWithMostComments = await this.prisma.song.findFirst({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        comments: {
          _count: 'desc',
        },
      },
    });

    return {
      totalComments,
      newCommentsToday,
      pendingComments,
      flaggedComments,
      mostActiveSong: songWithMostComments
        ? {
            id: songWithMostComments.id,
            title: songWithMostComments.title,
            commentCount: songWithMostComments._count.comments,
          }
        : null,
    };
  }

  // Moderation methods have been removed
  async approveComment(id: string): Promise<any> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Update comment (moderation has been removed)
    const approvedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        // No moderation fields
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
    });

    return {
      ...approvedComment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async rejectComment(id: string): Promise<any> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Update comment (moderation has been removed)
    const rejectedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        // No moderation fields
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
    });

    return {
      ...rejectedComment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }

  async flagComment(id: string): Promise<any> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Update comment (moderation has been removed)
    const flaggedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        // No moderation fields
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
    });

    return {
      ...flaggedComment,
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
  }
}
