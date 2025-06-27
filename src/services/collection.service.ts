import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCollectionDto, UpdateCollectionDto, CollectionResponseDto } from '../dto/collection.dto';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createCollectionDto: CreateCollectionDto): Promise<CollectionResponseDto> {
    // Create the collection
    const collection = await this.prisma.collection.create({
      data: {
        name: createCollectionDto.name,
        description: createCollectionDto.description,
        imageUrl: createCollectionDto.imageUrl,
        metaTitle: createCollectionDto.metaTitle,
        metaDescription: createCollectionDto.metaDescription,
        isPublic: createCollectionDto.isPublic ?? true,
        isActive: createCollectionDto.isActive ?? true,
      },
      include: {
        songs: true,
      },
    });

    return collection;
  }

  async findAll(search?: string, sortBy?: string, customerId?: string): Promise<CollectionResponseDto[]> {
    const where: any = {
      isPublic: true,
    };

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Determine the order by clause based on sortBy parameter
    let orderBy: any = { name: 'asc' };
    if (sortBy === 'mostLiked') {
      orderBy = { likeCount: 'desc' };
    } else if (sortBy === 'mostViewed') {
      orderBy = { viewCount: 'desc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    // Get collections
    const collections = await this.prisma.collection.findMany({
      where,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
        // Include liked status if customerId is provided
        ...(customerId ? {
          likedBy: {
            where: {
              customerId,
            },
          },
        } : {}),
      },
      orderBy,
    });

    // Add isLiked property to each collection if customerId is provided
    if (customerId) {
      return collections.map(collection => {
        const { likedBy, ...collectionWithoutLikedBy } = collection;
        return {
          ...collectionWithoutLikedBy,
          isLiked: likedBy && likedBy.length > 0,
        };
      });
    }

    return collections;
  }

  async findOne(id: string, customerId?: string): Promise<CollectionResponseDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
        // Include liked status if customerId is provided
        ...(customerId ? {
          likedBy: {
            where: {
              customerId,
            },
          },
        } : {}),
      },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // Add isLiked property if customerId is provided
    if (customerId) {
      const { likedBy, ...collectionWithoutLikedBy } = collection;
      return {
        ...collectionWithoutLikedBy,
        isLiked: likedBy && likedBy.length > 0,
      };
    }

    return collection;
  }

  async update(id: string, updateCollectionDto: UpdateCollectionDto): Promise<CollectionResponseDto> {
    // Check if collection exists
    await this.findOne(id);

    // Prepare data for update
    const data: any = {};
    if (updateCollectionDto.name !== undefined) data.name = updateCollectionDto.name;
    if (updateCollectionDto.description !== undefined) data.description = updateCollectionDto.description;
    if (updateCollectionDto.imageUrl !== undefined) data.imageUrl = updateCollectionDto.imageUrl;
    if (updateCollectionDto.metaTitle !== undefined) data.metaTitle = updateCollectionDto.metaTitle;
    if (updateCollectionDto.metaDescription !== undefined) data.metaDescription = updateCollectionDto.metaDescription;
    if (updateCollectionDto.isPublic !== undefined) data.isPublic = updateCollectionDto.isPublic;
    if (updateCollectionDto.isActive !== undefined) data.isActive = updateCollectionDto.isActive;
    
    // Update collection
    const updatedCollection = await this.prisma.collection.update({
      where: { id },
      data,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedCollection;
  }

  async addSong(collectionId: string, songId: string): Promise<CollectionResponseDto> {
    // Check if collection exists
    const collection = await this.findOne(collectionId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is already in the collection
    const songs = collection.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (songExists) {
      throw new BadRequestException(`Song with ID ${songId} is already in the collection`);
    }

    // Add song to collection
    const updatedCollection = await this.prisma.collection.update({
      where: { id: collectionId },
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

    return updatedCollection;
  }

  async removeSong(collectionId: string, songId: string): Promise<CollectionResponseDto> {
    // Check if collection exists
    const collection = await this.findOne(collectionId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is in the collection
    const songs = collection.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (!songExists) {
      throw new BadRequestException(`Song with ID ${songId} is not in the collection`);
    }

    // Remove song from collection
    const updatedCollection = await this.prisma.collection.update({
      where: { id: collectionId },
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

    return updatedCollection;
  }

  async remove(id: string): Promise<CollectionResponseDto> {
    // Check if collection exists
    await this.findOne(id);

    // Delete collection
    const deletedCollection = await this.prisma.collection.delete({
      where: { id },
      include: {
        songs: true,
      },
    });

    return deletedCollection;
  }

  /**
   * Export all collections to CSV format
   * @returns CSV string containing all collections
   */
  async exportToCsv(): Promise<string> {
    this.logger.log('Exporting all collections to CSV');

    try {
      // Get all collections with related data
      const collections = await this.prisma.collection.findMany({
        include: {
          songs: true,
          collectionTags: {
            include: {
              tag: true,
            },
          },
        },
      });

      this.logger.log(`Found ${collections.length} collections to export`);

      // Transform data for CSV export
      const csvData = collections.map(collection => this.transformCollectionForCsv(collection));

      // Generate CSV
      return new Promise((resolve, reject) => {
        csvStringify(csvData, {
          header: true,
        }, (error, output) => {
          if (error) {
            this.logger.error(`Error generating CSV: ${error.message}`);
            reject(new InternalServerErrorException('Failed to generate CSV'));
          } else {
            resolve(output);
          }
        });
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting collections to CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to export collections to CSV');
    }
  }

  /**
   * Export collection-song relationships to CSV format
   * @returns CSV string containing all collection-song relationships
   */
  async exportSongRelationshipsToCsv(): Promise<string> {
    this.logger.log('Exporting collection-song relationships to CSV');

    try {
      // Get all collections with songs
      const collections = await this.prisma.collection.findMany({
        include: {
          songs: {
            include: {
              artist: true,
            },
          },
        },
      });

      // Create a flat list of collection-song relationships
      const relationships: Array<{
        collectionId: string;
        collectionName: string;
        songId: string;
        songTitle: string;
        artistName: string;
      }> = [];

      for (const collection of collections) {
        for (const song of collection.songs) {
          relationships.push({
            collectionId: collection.id,
            collectionName: collection.name,
            songId: song.id,
            songTitle: song.title,
            artistName: song.artist?.name || '',
          });
        }
      }

      this.logger.log(`Found ${relationships.length} collection-song relationships to export`);

      // Generate CSV
      return new Promise((resolve, reject) => {
        csvStringify(relationships, {
          header: true,
        }, (error, output) => {
          if (error) {
            this.logger.error(`Error generating CSV: ${error.message}`);
            reject(new InternalServerErrorException('Failed to generate CSV'));
          } else {
            resolve(output);
          }
        });
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting collection-song relationships to CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to export collection-song relationships to CSV');
    }
  }

  /**
   * Import collections from CSV buffer
   * @param buffer CSV file buffer
   * @returns Number of collections imported
   */
  async importFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    this.logger.log('Importing collections from CSV');

    try {
      // Parse CSV buffer
      const collections = await this.parseCsvBuffer(buffer);
      this.logger.log(`Parsed ${collections.length} collections from CSV`);

      const results = {
        imported: 0,
        errors: [] as string[],
      };

      // Process each collection
      for (const collectionData of collections) {
        try {
          // Check if collection already exists by ID
          if (collectionData.id) {
            const existingCollection = await this.prisma.collection.findUnique({
              where: { id: collectionData.id },
            });

            if (existingCollection) {
              // Update existing collection
              await this.update(collectionData.id, this.prepareCollectionDataForUpdate(collectionData));
              results.imported++;
              continue;
            }
          }

          // Create new collection
          await this.create(this.prepareCollectionDataForCreate(collectionData));
          results.imported++;
        } catch (error: unknown) {
          const errorMessage = `Error importing collection ${collectionData.name || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error importing collections from CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to import collections from CSV');
    }
  }

  /**
   * Import collection-song relationships from CSV buffer
   * @param buffer CSV file buffer
   * @returns Number of relationships imported
   */
  async importSongRelationshipsFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    this.logger.log('Importing collection-song relationships from CSV');

    try {
      // Parse CSV buffer
      const relationships = await this.parseCsvBuffer(buffer);
      this.logger.log(`Parsed ${relationships.length} collection-song relationships from CSV`);

      const results = {
        imported: 0,
        errors: [] as string[],
      };

      // Process each relationship
      for (const relationship of relationships) {
        try {
          // Check if collection and song exist
          if (!relationship.collectionId || !relationship.songId) {
            throw new BadRequestException('Collection ID and Song ID are required');
          }

          // Add song to collection
          await this.addSong(relationship.collectionId, relationship.songId);
          results.imported++;
        } catch (error: unknown) {
          const errorMessage = `Error importing relationship between collection ${relationship.collectionId} and song ${relationship.songId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error importing collection-song relationships from CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to import collection-song relationships from CSV');
    }
  }

  /**
   * Parse a CSV buffer into an array of objects
   */
  private async parseCsvBuffer(buffer: Buffer): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];

      Readable.from(buffer)
        .pipe(csvParse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (data) => results.push(data))
        .on('error', (error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error parsing CSV buffer: ${errorMessage}`);
          reject(error);
        })
        .on('end', () => {
          resolve(results);
        });
    });
  }

  /**
   * Transform a collection entity to a flat object for CSV export
   */
  private transformCollectionForCsv(collection: any): Record<string, any> {
    // Extract tags as comma-separated string
    const tags = collection.collectionTags
      ? collection.collectionTags.map((ct: any) => ct.tag?.name).filter(Boolean).join(',')
      : '';

    // Extract song IDs as comma-separated string
    const songIds = collection.songs
      ? collection.songs.map((song: any) => song.id).join(',')
      : '';

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description || '',
      imageUrl: collection.imageUrl || '',
      isPublic: collection.isPublic ? 'true' : 'false',
      isActive: collection.isActive ? 'true' : 'false',
      viewCount: collection.viewCount || 0,
      uniqueViewers: collection.uniqueViewers || 0,
      tags: tags,
      songIds: songIds,
      songCount: collection.songs ? collection.songs.length : 0,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }

  /**
   * Prepare collection data from CSV for create operation
   */
  private prepareCollectionDataForCreate(collectionData: any): CreateCollectionDto {
    return {
      name: collectionData.name,
      description: collectionData.description || null,
      imageUrl: collectionData.imageUrl || null,
      isPublic: collectionData.isPublic === 'true' || collectionData.isPublic === true,
      isActive: collectionData.isActive === 'true' || collectionData.isActive === true,
    };
  }

  /**
   * Prepare collection data from CSV for update operation
   */
  private prepareCollectionDataForUpdate(collectionData: any): UpdateCollectionDto {
    const updateData: UpdateCollectionDto = {};

    if (collectionData.name !== undefined) updateData.name = collectionData.name;
    if (collectionData.description !== undefined) updateData.description = collectionData.description || null;
    if (collectionData.imageUrl !== undefined) updateData.imageUrl = collectionData.imageUrl || null;
    if (collectionData.isPublic !== undefined) {
      updateData.isPublic = collectionData.isPublic === 'true' || collectionData.isPublic === true;
    }
    if (collectionData.isActive !== undefined) {
      updateData.isActive = collectionData.isActive === 'true' || collectionData.isActive === true;
    }

    return updateData;
  }
}
