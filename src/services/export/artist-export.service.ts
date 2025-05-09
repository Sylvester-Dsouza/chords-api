import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CsvService } from '../csv.service';
import { Artist } from '@prisma/client';

@Injectable()
export class ArtistExportService {
  private readonly logger = new Logger(ArtistExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvService: CsvService,
  ) {}

  /**
   * Export all artists to CSV format
   * @returns CSV string containing all artists
   */
  async exportToCsv(): Promise<string> {
    this.logger.log('Exporting all artists to CSV');

    try {
      // Get all artists with related data
      const artists = await this.prisma.artist.findMany({
        include: {
          artistTags: {
            include: {
              tag: true,
            },
          },
        },
      });

      this.logger.log(`Found ${artists.length} artists to export`);

      // Transform data for CSV export
      const csvData = artists.map(artist => this.transformArtistForCsv(artist));

      // Generate CSV
      return await this.csvService.generateCsvString(csvData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting artists to CSV: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Transform an artist entity to a flat object for CSV export
   */
  private transformArtistForCsv(artist: any): Record<string, any> {
    // Extract tags as comma-separated string
    const tags = artist.artistTags
      ? artist.artistTags.map((at: { tag?: { name: string } }) => at.tag?.name).filter(Boolean).join(',')
      : '';

    // Handle social links (convert JSON to string)
    let socialLinks = '';
    if (artist.socialLinks) {
      try {
        if (typeof artist.socialLinks === 'string') {
          socialLinks = artist.socialLinks;
        } else {
          socialLinks = JSON.stringify(artist.socialLinks);
        }
      } catch (e) {
        this.logger.warn(`Could not stringify social links for artist ${artist.id}`);
      }
    }

    return {
      id: artist.id,
      name: artist.name,
      bio: artist.bio || '',
      imageUrl: artist.imageUrl || '',
      website: artist.website || '',
      socialLinks: socialLinks,
      isFeatured: artist.isFeatured ? 'true' : 'false',
      viewCount: artist.viewCount || 0,
      uniqueViewers: artist.uniqueViewers || 0,
      tags: tags,
      createdAt: artist.createdAt.toISOString(),
      updatedAt: artist.updatedAt.toISOString(),
    };
  }
}
