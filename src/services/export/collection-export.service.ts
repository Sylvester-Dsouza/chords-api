import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CsvService } from '../csv.service';
import { Collection } from '@prisma/client';

@Injectable()
export class CollectionExportService {
  private readonly logger = new Logger(CollectionExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvService: CsvService,
  ) {}

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
      return await this.csvService.generateCsvString(csvData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting collections to CSV: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Export collection songs relationship to CSV format
   * @returns CSV string containing all collection-song relationships
   */
  async exportSongRelationshipsToCsv(): Promise<string> {
    this.logger.log('Exporting collection-song relationships to CSV');

    try {
      // Get all collections with songs
      const collections = await this.prisma.collection.findMany({
        include: {
          songs: true,
        },
      });

      // Create a flat list of collection-song relationships
      const relationships = [];

      for (const collection of collections) {
        for (const song of collection.songs) {
          relationships.push({
            collectionId: collection.id,
            collectionName: collection.name,
            songId: song.id,
            songTitle: song.title,
          });
        }
      }

      this.logger.log(`Found ${relationships.length} collection-song relationships to export`);

      // Generate CSV
      return await this.csvService.generateCsvString(relationships);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting collection-song relationships to CSV: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Transform a collection entity to a flat object for CSV export
   */
  private transformCollectionForCsv(collection: any): Record<string, any> {
    // Extract tags as comma-separated string
    const tags = collection.collectionTags
      ? collection.collectionTags.map((ct: { tag?: { name: string } }) => ct.tag?.name).filter(Boolean).join(',')
      : '';

    // Extract song IDs as comma-separated string
    const songIds = collection.songs
      ? collection.songs.map((song: { id: string }) => song.id).join(',')
      : '';

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description || '',
      imageUrl: collection.imageUrl || '',
      isPublic: collection.isPublic ? 'true' : 'false',
      viewCount: collection.viewCount || 0,
      uniqueViewers: collection.uniqueViewers || 0,
      tags: tags,
      songIds: songIds,
      songCount: collection.songs ? collection.songs.length : 0,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }
}
