import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CsvService } from '../csv.service';
import { Song } from '@prisma/client';

@Injectable()
export class SongExportService {
  private readonly logger = new Logger(SongExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvService: CsvService,
  ) {}

  /**
   * Export all songs to CSV format
   * @returns CSV string containing all songs
   */
  async exportToCsv(): Promise<string> {
    this.logger.log('Exporting all songs to CSV');

    try {
      // Get all songs with related data
      const songs = await this.prisma.song.findMany({
        include: {
          artist: true,
          language: true,
          songTags: {
            include: {
              tag: true,
            },
          },
        },
      });

      this.logger.log(`Found ${songs.length} songs to export`);

      // Transform data for CSV export
      const csvData = songs.map(song => this.transformSongForCsv(song));

      // Generate CSV
      return await this.csvService.generateCsvString(csvData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error exporting songs to CSV: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Transform a song entity to a flat object for CSV export
   */
  private transformSongForCsv(song: any): Record<string, any> {
    // Extract tags as comma-separated string
    const tags = song.songTags
      ? song.songTags.map((st: { tag?: { name: string } }) => st.tag?.name).filter(Boolean).join(',')
      : '';

    return {
      id: song.id,
      title: song.title,
      artistId: song.artistId,
      artistName: song.artist?.name || '',
      languageId: song.languageId || '',
      languageName: song.language?.name || '',
      key: song.key || '',
      tempo: song.tempo || '',
      timeSignature: song.timeSignature || '',
      difficulty: song.difficulty || '',
      capo: song.capo || 0,
      chordSheet: song.chordSheet,
      imageUrl: song.imageUrl || '',
      tags: tags,
      viewCount: song.viewCount || 0,
      uniqueViewers: song.uniqueViewers || 0,
      createdAt: song.createdAt.toISOString(),
      updatedAt: song.updatedAt.toISOString(),
    };
  }
}
