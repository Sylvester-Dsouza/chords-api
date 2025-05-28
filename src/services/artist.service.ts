import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateArtistDto, UpdateArtistDto, ArtistResponseDto } from '../dto/artist.dto';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArtistService {
  private readonly logger = new Logger(ArtistService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createArtistDto: CreateArtistDto): Promise<ArtistResponseDto> {
    // Check if artist with the same name already exists
    const existingArtist = await this.prisma.artist.findUnique({
      where: { name: createArtistDto.name },
    });

    if (existingArtist) {
      throw new ConflictException(`Artist with name '${createArtistDto.name}' already exists`);
    }

    // Prepare data for Prisma (convert SocialLinks to plain object)
    const data = {
      name: createArtistDto.name,
      bio: createArtistDto.bio,
      imageUrl: createArtistDto.imageUrl,
      website: createArtistDto.website,
      isFeatured: createArtistDto.isFeatured,
      isActive: createArtistDto.isActive,
      socialLinks: createArtistDto.socialLinks ? JSON.parse(JSON.stringify(createArtistDto.socialLinks)) : undefined
    };

    // Create the artist
    const artist = await this.prisma.artist.create({
      data,
    });

    return artist;
  }

  async findAll(search?: string): Promise<ArtistResponseDto[]> {
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      const searchConditions = [];

      // For each search term, create fuzzy search conditions
      for (const term of searchTerms) {
        searchConditions.push({
          OR: [
            {
              name: {
                contains: term,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              bio: {
                contains: term,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        });
      }

      const where = searchConditions.length === 1
        ? searchConditions[0]
        : { AND: searchConditions };

      return this.prisma.artist.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      });
    }

    return this.prisma.artist.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string): Promise<ArtistResponseDto> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        songs: true,
      },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return artist;
  }

  async update(id: string, updateArtistDto: UpdateArtistDto): Promise<ArtistResponseDto> {
    // Check if artist exists
    await this.findOne(id);

    // If name is being updated, check if it conflicts with another artist
    if (updateArtistDto.name) {
      const existingArtist = await this.prisma.artist.findUnique({
        where: { name: updateArtistDto.name },
      });

      if (existingArtist && existingArtist.id !== id) {
        throw new ConflictException(`Artist with name '${updateArtistDto.name}' already exists`);
      }
    }

    // Prepare data for Prisma (convert SocialLinks to plain object)
    const data: any = {};
    if (updateArtistDto.name !== undefined) data.name = updateArtistDto.name;
    if (updateArtistDto.bio !== undefined) data.bio = updateArtistDto.bio;
    if (updateArtistDto.imageUrl !== undefined) data.imageUrl = updateArtistDto.imageUrl;
    if (updateArtistDto.website !== undefined) data.website = updateArtistDto.website;
    if (updateArtistDto.isFeatured !== undefined) data.isFeatured = updateArtistDto.isFeatured;
    if (updateArtistDto.isActive !== undefined) data.isActive = updateArtistDto.isActive;
    if (updateArtistDto.socialLinks !== undefined) {
      data.socialLinks = updateArtistDto.socialLinks ? JSON.parse(JSON.stringify(updateArtistDto.socialLinks)) : null;
    }

    // Update artist
    const updatedArtist = await this.prisma.artist.update({
      where: { id },
      data,
    });

    return updatedArtist;
  }

  async remove(id: string): Promise<ArtistResponseDto> {
    // Check if artist exists
    await this.findOne(id);

    // Delete artist
    const deletedArtist = await this.prisma.artist.delete({
      where: { id },
    });

    return deletedArtist;
  }

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
      const csvData = artists.map((artist: any) => this.transformArtistForCsv(artist));

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
      this.logger.error(`Error exporting artists to CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to export artists to CSV');
    }
  }

  /**
   * Import artists from CSV buffer
   * @param buffer CSV file buffer
   * @returns Number of artists imported
   */
  async importFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    this.logger.log('Importing artists from CSV');

    try {
      // Parse CSV buffer
      const artists = await this.parseCsvBuffer(buffer);
      this.logger.log(`Parsed ${artists.length} artists from CSV`);

      const results = {
        imported: 0,
        errors: [] as string[],
      };

      // Process each artist
      for (const artistData of artists) {
        try {
          // Check if artist already exists by ID
          if (artistData.id) {
            const existingArtist = await this.prisma.artist.findUnique({
              where: { id: artistData.id },
            });

            if (existingArtist) {
              // Update existing artist
              await this.update(artistData.id, this.prepareArtistDataForUpdate(artistData));
              results.imported++;
              continue;
            }
          }

          // Check if artist already exists by name
          if (artistData.name) {
            const existingArtist = await this.prisma.artist.findUnique({
              where: { name: artistData.name },
            });

            if (existingArtist) {
              // Update existing artist
              await this.update(existingArtist.id, this.prepareArtistDataForUpdate(artistData));
              results.imported++;
              continue;
            }
          }

          // Create new artist
          await this.create(this.prepareArtistDataForCreate(artistData));
          results.imported++;
        } catch (error: unknown) {
          const errorMessage = `Error importing artist ${artistData.name || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error importing artists from CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to import artists from CSV');
    }
  }

  /**
   * Parse a CSV buffer into an array of artist objects
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
   * Transform an artist entity to a flat object for CSV export
   */
  private transformArtistForCsv(artist: any): Record<string, any> {
    // Extract tags as comma-separated string
    const tags = artist.artistTags
      ? artist.artistTags.map((at: any) => at.tag?.name).filter(Boolean).join(',')
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
      } catch (e: unknown) {
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
      isActive: artist.isActive ? 'true' : 'false',
      viewCount: artist.viewCount || 0,
      uniqueViewers: artist.uniqueViewers || 0,
      tags: tags,
      createdAt: artist.createdAt.toISOString(),
      updatedAt: artist.updatedAt.toISOString(),
    };
  }

  /**
   * Prepare artist data from CSV for create operation
   */
  private prepareArtistDataForCreate(artistData: any): CreateArtistDto {
    // Parse social links if provided as string
    let socialLinks = null;
    if (artistData.socialLinks) {
      try {
        socialLinks = typeof artistData.socialLinks === 'string'
          ? JSON.parse(artistData.socialLinks)
          : artistData.socialLinks;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        this.logger.warn(`Could not parse social links for artist ${artistData.name}: ${errorMessage}`);
      }
    }

    return {
      name: artistData.name,
      bio: artistData.bio || null,
      imageUrl: artistData.imageUrl || null,
      website: artistData.website || null,
      socialLinks: socialLinks,
      isFeatured: artistData.isFeatured === 'true' || artistData.isFeatured === true,
      isActive: artistData.isActive === 'true' || artistData.isActive === true,
    };
  }

  /**
   * Prepare artist data from CSV for update operation
   */
  private prepareArtistDataForUpdate(artistData: any): UpdateArtistDto {
    // Parse social links if provided as string
    let socialLinks = undefined;
    if (artistData.socialLinks !== undefined) {
      try {
        socialLinks = typeof artistData.socialLinks === 'string'
          ? JSON.parse(artistData.socialLinks)
          : artistData.socialLinks;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        this.logger.warn(`Could not parse social links for artist ${artistData.name}: ${errorMessage}`);
      }
    }

    const updateData: UpdateArtistDto = {};

    if (artistData.name !== undefined) updateData.name = artistData.name;
    if (artistData.bio !== undefined) updateData.bio = artistData.bio || null;
    if (artistData.imageUrl !== undefined) updateData.imageUrl = artistData.imageUrl || null;
    if (artistData.website !== undefined) updateData.website = artistData.website || null;
    if (artistData.socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (artistData.isFeatured !== undefined) {
      updateData.isFeatured = artistData.isFeatured === 'true' || artistData.isFeatured === true;
    }
    if (artistData.isActive !== undefined) {
      updateData.isActive = artistData.isActive === 'true' || artistData.isActive === true;
    }

    return updateData;
  }
}
