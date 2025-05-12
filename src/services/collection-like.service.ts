import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CollectionLikeResponseDto, CollectionLikeStatusDto } from '../dto/collection-like.dto';
import { Collection } from '@prisma/client';

@Injectable()
export class CollectionLikeService {
  private readonly logger = new Logger(CollectionLikeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Toggle like status for a collection
   * @param collectionId Collection ID
   * @param customerId Customer ID
   * @returns Updated like status
   */
  async toggleLike(collectionId: string, customerId: string): Promise<CollectionLikeStatusDto> {
    // Check if collection exists
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${collectionId} not found`);
    }

    // Check if customer has already liked this collection
    const existingLike = await this.prisma.likedCollection.findUnique({
      where: {
        customerId_collectionId: {
          customerId,
          collectionId,
        },
      },
    });

    // Use a transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      let updatedCollection: Collection;

      if (existingLike) {
        // Unlike: Remove the like
        await prisma.likedCollection.delete({
          where: {
            customerId_collectionId: {
              customerId,
              collectionId,
            },
          },
        });

        // Decrement like count
        updatedCollection = await prisma.collection.update({
          where: { id: collectionId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        });

        return {
          isLiked: false,
          likeCount: updatedCollection.likeCount,
        };
      } else {
        // Like: Add a new like
        await prisma.likedCollection.create({
          data: {
            customerId,
            collectionId,
          },
        });

        // Increment like count
        updatedCollection = await prisma.collection.update({
          where: { id: collectionId },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        });

        return {
          isLiked: true,
          likeCount: updatedCollection.likeCount,
        };
      }
    });
  }

  /**
   * Get like status for a collection
   * @param collectionId Collection ID
   * @param customerId Customer ID
   * @returns Like status
   */
  async getLikeStatus(collectionId: string, customerId: string): Promise<CollectionLikeStatusDto> {
    // Check if collection exists
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${collectionId} not found`);
    }

    // Check if customer has liked this collection
    const existingLike = await this.prisma.likedCollection.findUnique({
      where: {
        customerId_collectionId: {
          customerId,
          collectionId,
        },
      },
    });

    return {
      isLiked: !!existingLike,
      likeCount: collection.likeCount,
    };
  }

  /**
   * Get all collections liked by a customer
   * @param customerId Customer ID
   * @returns List of liked collections
   */
  async getLikedCollections(customerId: string): Promise<CollectionLikeResponseDto[]> {
    const likedCollections = await this.prisma.likedCollection.findMany({
      where: {
        customerId,
      },
      include: {
        collection: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return likedCollections.map((like: any) => ({
      collectionId: like.collectionId,
      customerId: like.customerId,
      isLiked: true,
      likeCount: like.collection.likeCount,
      createdAt: like.createdAt,
    }));
  }

  /**
   * Check if a collection is liked by a customer
   * @param collectionId Collection ID
   * @param customerId Customer ID
   * @returns True if liked, false otherwise
   */
  async isCollectionLiked(collectionId: string, customerId: string): Promise<boolean> {
    const like = await this.prisma.likedCollection.findUnique({
      where: {
        customerId_collectionId: {
          customerId,
          collectionId,
        },
      },
    });

    return !!like;
  }
}
