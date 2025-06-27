import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { CreateSongDto, UpdateSongDto, SongResponseDto } from '../dto/song.dto';
import { ArtistResponseDto } from '../dto/artist.dto';
import { LanguageResponseDto } from '../dto/language.dto';
import { Song } from '@prisma/client';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';

@Injectable()
export class SongService {
  private readonly logger = new Logger(SongService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}
  
  /**
   * Determines the optimal cache TTL based on query parameters
   * - Search queries: shorter TTL as they're more personalized
   * - Artist/tag specific queries: medium TTL as they change less frequently
   * - Sorted by trending/popularity: shorter TTL as they change more frequently
   * - Default queries: longer TTL as they're more stable
   */
  private getCacheTTLForSongQuery(
    search?: string,
    artistId?: string,
    tags?: string,
    sortBy?: string
  ): number {
    // Search queries should have shorter TTL
    if (search) {
      return CacheTTL.SHORT; // 60 seconds
    }
    
    // Trending or popularity-based sorting should have shorter TTL
    if (sortBy === 'viewCount' || sortBy === 'averageRating') {
      return CacheTTL.SHORT; // 60 seconds
    }
    
    // Artist or tag specific queries can have medium TTL
    if (artistId || tags) {
      return CacheTTL.MEDIUM; // 5 minutes
    }
    
    // Default queries can have longer TTL
    return CacheTTL.LONG; // 30 minutes
  }

  async create(createSongDto: CreateSongDto): Promise<SongResponseDto> {
    // Check if artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: createSongDto.artistId },
    });

    if (!artist) {
      throw new BadRequestException(`Artist with ID ${createSongDto.artistId} not found`);
    }

    // Check if language exists if provided
    if (createSongDto.languageId) {
      const language = await this.prisma.language.findUnique({
        where: { id: createSongDto.languageId },
      });

      if (!language) {
        throw new BadRequestException(`Language with ID ${createSongDto.languageId} not found`);
      }
    }

    // Create the song with explicit field handling
    const song = await this.prisma.song.create({
      data: {
        title: createSongDto.title,
        artistId: createSongDto.artistId,
        languageId: createSongDto.languageId,
        key: createSongDto.key,
        tempo: createSongDto.tempo,
        timeSignature: createSongDto.timeSignature,
        difficulty: createSongDto.difficulty,
        chordSheet: createSongDto.chordSheet,
        imageUrl: createSongDto.imageUrl,
        officialVideoUrl: createSongDto.officialVideoUrl,
        tutorialVideoUrl: createSongDto.tutorialVideoUrl,
        capo: createSongDto.capo,
        metaTitle: createSongDto.metaTitle,
        metaDescription: createSongDto.metaDescription,
        status: createSongDto.status,
        tags: createSongDto.tags,
      },
      include: {
        artist: true,
        language: true,
      },
    });

    // Invalidate songs list cache
    await this.cacheService.deleteByPrefix(CachePrefix.SONGS);
    this.logger.debug(`Invalidated songs list cache after creating song ${song.id}`);

    return song;
  }

  async findAll(search?: string, artistId?: string, tags?: string): Promise<SongResponseDto[]> {
    // Create a cache key based on the filters
    const filters = { search, artistId, tags };
    const cacheKey = this.cacheService.createListKey(CachePrefix.SONGS, filters);

    try {
      // Try to get from cache first
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for songs list with filters: ${JSON.stringify(filters)}`);

          const where: any = {};

          // Add search filter with fuzzy search capability
          if (search) {
            const searchTerms = search.trim().split(/\s+/);
            const searchConditions = [];

            // For each search term, create fuzzy search conditions
            for (const term of searchTerms) {
              searchConditions.push({
                OR: [
                  {
                    title: {
                      contains: term,
                      mode: 'insensitive',
                    },
                  },
                  {
                    artist: {
                      name: {
                        contains: term,
                        mode: 'insensitive',
                      },
                    },
                  },
                  // Add chord sheet search for better results
                  {
                    chordSheet: {
                      contains: term,
                      mode: 'insensitive',
                    },
                  },
                ],
              });
            }

            // Combine all search conditions with AND logic for better relevance
            if (searchConditions.length === 1) {
              where.OR = searchConditions[0].OR;
            } else {
              where.AND = searchConditions;
            }
          }

          // Add artist filter
          if (artistId) {
            where.artistId = artistId;
          }

          // Add tags filter
          if (tags) {
            const tagList = tags.split(',').map(tag => tag.trim());
            where.tags = {
              hasSome: tagList,
            };
          }

          return this.prisma.song.findMany({
            where,
            include: {
              artist: true,
              language: true,
            },
            orderBy: {
              title: 'asc',
            },
          });
        },
        // Use shorter TTL for search results
        search ? CacheTTL.SHORT : CacheTTL.MEDIUM
      );
    } catch (error: any) {
      this.logger.error(`Error fetching songs with filters ${JSON.stringify(filters)}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const where: any = {};

      // Add search filter with fuzzy search capability
      if (search) {
        const searchTerms = search.trim().split(/\s+/);
        const searchConditions = [];

        // For each search term, create fuzzy search conditions
        for (const term of searchTerms) {
          searchConditions.push({
            OR: [
              {
                title: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
              {
                artist: {
                  name: {
                    contains: term,
                    mode: 'insensitive',
                  },
                },
              },
              // Add chord sheet search for better results
              {
                chordSheet: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
            ],
          });
        }

        // Combine all search conditions with AND logic for better relevance
        if (searchConditions.length === 1) {
          where.OR = searchConditions[0].OR;
        } else {
          where.AND = searchConditions;
        }
      }

      // Add artist filter
      if (artistId) {
        where.artistId = artistId;
      }

      // Add tags filter
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        where.tags = {
          hasSome: tagList,
        };
      }

      return this.prisma.song.findMany({
        where,
        include: {
          artist: true,
          language: true,
        },
        orderBy: {
          title: 'asc',
        },
      });
    }
  }

  // Incremental sync method for mobile app
  async findAllSince(since?: string, limit: number = 100): Promise<SongResponseDto[]> {
    try {
      const where: any = {};

      // If since timestamp is provided, only get songs updated after that time
      if (since) {
        where.updatedAt = {
          gt: new Date(since)
        };
      }

      const songs = await this.prisma.song.findMany({
        where,
        include: {
          artist: true,
          language: true,
        },
        orderBy: {
          updatedAt: 'desc', // Most recently updated first
        },
        take: limit,
      });

      this.logger.debug(`Found ${songs.length} songs ${since ? `updated since ${since}` : 'total'}`);
      return songs;
    } catch (error: any) {
      this.logger.error(`Error fetching songs since ${since}: ${error.message}`);
      throw error;
    }
  }

  // New paginated method for better performance
  async findAllPaginated(filters: {
    search?: string;
    artistId?: string;
    tags?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ data: SongResponseDto[]; pagination: any }> {
    const {
      search,
      artistId,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'title',
      sortOrder = 'asc'
    } = filters;

    const cacheKey = this.cacheService.createListKey(CachePrefix.SONGS, filters);

    try {
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for paginated songs with filters: ${JSON.stringify(filters)}`);

          const where: any = {};

          // Add search filter with fuzzy search capability
          if (search) {
            const searchTerms = search.trim().split(/\s+/);
            const searchConditions = [];

            // For each search term, create fuzzy search conditions
            for (const term of searchTerms) {
              searchConditions.push({
                OR: [
                  {
                    title: {
                      contains: term,
                      mode: 'insensitive',
                    },
                  },
                  {
                    artist: {
                      name: {
                        contains: term,
                        mode: 'insensitive',
                      },
                    },
                  },
                  // Add chord sheet search for better results
                  {
                    chordSheet: {
                      contains: term,
                      mode: 'insensitive',
                    },
                  },
                ],
              });
            }

            // Combine all search conditions with AND logic for better relevance
            if (searchConditions.length === 1) {
              where.OR = searchConditions[0].OR;
            } else {
              where.AND = searchConditions;
            }
          }

          // Add artist filter
          if (artistId) {
            where.artistId = artistId;
          }

          // Add tags filter
          if (tags) {
            const tagList = tags.split(',').map(tag => tag.trim());
            where.tags = {
              hasSome: tagList,
            };
          }

          // Calculate pagination
          const skip = (page - 1) * limit;

          // Get total count for pagination
          const total = await this.prisma.song.count({ where });

          // Build orderBy based on sortBy parameter
          let orderBy: any = { title: 'asc' };
          if (sortBy === 'createdAt') {
            orderBy = { createdAt: sortOrder };
          } else if (sortBy === 'viewCount') {
            orderBy = { viewCount: sortOrder };
          } else if (sortBy === 'averageRating') {
            orderBy = { averageRating: sortOrder };
          } else if (sortBy === 'artist') {
            orderBy = { artist: { name: sortOrder } };
          }

          // Use select instead of include for better performance
          // Only retrieve the fields that are actually needed for list view
          const songsData = await this.prisma.song.findMany({
            where,
            select: {
              id: true,
              title: true,
              key: true,
              tempo: true,
              difficulty: true,
              viewCount: true,
              averageRating: true,
              createdAt: true,
              updatedAt: true,
              metaTitle: true,
              metaDescription: true,
              artistId: true,
              languageId: true,
              chordSheet: true,
              capo: true,
              status: true,
              uniqueViewers: true,
              lastViewed: true,
              imageUrl: true,
              officialVideoUrl: true,
              tutorialVideoUrl: true,
              timeSignature: true,
              // Only select necessary fields from related entities
              artist: {
                select: {
                  id: true,
                  name: true,
                }
              },
              language: {
                select: {
                  id: true,
                  name: true,
                }
              },
              songTags: {
                select: {
                  tag: {
                    select: {
                      name: true
                    }
                  }
                }
              },
            },
            orderBy,
            skip,
            take: limit,
          });
          
          // Map the Prisma result to SongResponseDto format
          const songs = songsData.map(song => {
            const dto = new SongResponseDto();
            dto.id = song.id;
            dto.title = song.title;
            dto.artistId = song.artistId;
            
            // Map artist data if available
            if (song.artist) {
              const artistDto = new ArtistResponseDto();
              artistDto.id = song.artist.id;
              artistDto.name = song.artist.name;
              dto.artist = artistDto;
            }
            
            dto.languageId = song.languageId;
            
            // Map language data if available
            if (song.language) {
              const languageDto = new LanguageResponseDto();
              languageDto.id = song.language.id;
              languageDto.name = song.language.name;
              dto.language = languageDto;
            } else {
              dto.language = null;
            }
            
            dto.key = song.key;
            dto.tempo = song.tempo;
            dto.timeSignature = song.timeSignature;
            dto.difficulty = song.difficulty;
            dto.chordSheet = song.chordSheet || '';
            dto.imageUrl = song.imageUrl;
            dto.officialVideoUrl = song.officialVideoUrl;
            dto.tutorialVideoUrl = song.tutorialVideoUrl;
            dto.capo = song.capo || 0;
            
            // Map tags from songTags relation
            dto.tags = song.songTags ? 
              song.songTags.map((tagRelation: { tag: { name: string } }) => tagRelation.tag.name) : 
              [];
              
            dto.status = song.status as 'DRAFT' | 'ACTIVE';
            dto.viewCount = song.viewCount;
            dto.uniqueViewers = song.uniqueViewers;
            dto.lastViewed = song.lastViewed;
            dto.createdAt = song.createdAt;
            dto.updatedAt = song.updatedAt;
            dto.metaTitle = song.metaTitle;
            dto.metaDescription = song.metaDescription;
            return dto;
          });

          const totalPages = Math.ceil(total / limit);

          return {
            data: songs,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          };
        },
        // Use shorter TTL for search results
        search ? CacheTTL.SHORT : CacheTTL.MEDIUM
      );
    } catch (error: any) {
      this.logger.error(`Error fetching paginated songs with filters ${JSON.stringify(filters)}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const where: any = {};

      // Add search filter with fuzzy search capability
      if (search) {
        const searchTerms = search.trim().split(/\s+/);
        const searchConditions = [];

        // For each search term, create fuzzy search conditions
        for (const term of searchTerms) {
          searchConditions.push({
            OR: [
              {
                title: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
              {
                artist: {
                  name: {
                    contains: term,
                    mode: 'insensitive',
                  },
                },
              },
              // Add chord sheet search for better results
              {
                chordSheet: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
            ],
          });
        }

        // Combine all search conditions with AND logic for better relevance
        if (searchConditions.length === 1) {
          where.OR = searchConditions[0].OR;
        } else {
          where.AND = searchConditions;
        }
      }

      // Add artist filter
      if (artistId) {
        where.artistId = artistId;
      }

      // Add tags filter
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        where.tags = {
          hasSome: tagList,
        };
      }

      // Calculate pagination for fallback
      const skip = (page - 1) * limit;
      const total = await this.prisma.song.count({ where });

      // Build orderBy based on sortBy parameter
      let orderBy: any = { title: 'asc' };
      if (sortBy === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      } else if (sortBy === 'viewCount') {
        orderBy = { viewCount: sortOrder };
      } else if (sortBy === 'averageRating') {
        orderBy = { averageRating: sortOrder };
      } else if (sortBy === 'artist') {
        orderBy = { artist: { name: sortOrder } };
      }

      const songs = await this.prisma.song.findMany({
        where,
        include: {
          artist: true,
          language: true,
        },
        orderBy,
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: songs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    }
  }

  async findOne(id: string): Promise<SongResponseDto> {
    const cacheKey = this.cacheService.createKey(CachePrefix.SONG, id);

    try {
      // Try to get from cache first
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for song ${id}, fetching from database`);
          const song = await this.prisma.song.findUnique({
            where: { id },
            include: {
              artist: true,
              language: true,
            },
          });

          if (!song) {
            throw new NotFoundException(`Song with ID ${id} not found`);
          }

          return song;
        },
        CacheTTL.LONG // Songs don't change often
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching song ${id}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const song = await this.prisma.song.findUnique({
        where: { id },
        include: {
          artist: true,
          language: true,
        },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${id} not found`);
      }

      return song;
    }
  }

  async update(id: string, updateSongDto: UpdateSongDto): Promise<SongResponseDto> {
    // Check if song exists
    await this.findOne(id);

    // If artistId is provided, check if artist exists
    if (updateSongDto.artistId) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: updateSongDto.artistId },
      });

      if (!artist) {
        throw new BadRequestException(`Artist with ID ${updateSongDto.artistId} not found`);
      }
    }

    // If languageId is provided, check if language exists
    if (updateSongDto.languageId) {
      const language = await this.prisma.language.findUnique({
        where: { id: updateSongDto.languageId },
      });

      if (!language) {
        throw new BadRequestException(`Language with ID ${updateSongDto.languageId} not found`);
      }
    }

    // Prepare data for update
    const updateData: any = {};

    // Copy fields from updateSongDto to updateData
    if (updateSongDto.title !== undefined) updateData.title = updateSongDto.title;
    // Handle artist relation correctly
    if (updateSongDto.artistId !== undefined) {
      updateData.artist = {
        connect: { id: updateSongDto.artistId }
      };
    }
    // Handle language relation correctly
    if (updateSongDto.languageId !== undefined) {
      if (updateSongDto.languageId) {
        updateData.language = {
          connect: { id: updateSongDto.languageId }
        };
      } else {
        updateData.language = { disconnect: true };
      }
    }
    if (updateSongDto.key !== undefined) updateData.key = updateSongDto.key;
    if (updateSongDto.tempo !== undefined) updateData.tempo = updateSongDto.tempo;
    if (updateSongDto.timeSignature !== undefined) updateData.timeSignature = updateSongDto.timeSignature;
    if (updateSongDto.difficulty !== undefined) updateData.difficulty = updateSongDto.difficulty;
    if (updateSongDto.capo !== undefined) updateData.capo = updateSongDto.capo;
    if (updateSongDto.status !== undefined) updateData.status = updateSongDto.status;
    if (updateSongDto.chordSheet !== undefined) updateData.chordSheet = updateSongDto.chordSheet;
    if (updateSongDto.imageUrl !== undefined) updateData.imageUrl = updateSongDto.imageUrl;
    if (updateSongDto.officialVideoUrl !== undefined) updateData.officialVideoUrl = updateSongDto.officialVideoUrl;
    if (updateSongDto.tutorialVideoUrl !== undefined) updateData.tutorialVideoUrl = updateSongDto.tutorialVideoUrl;
    if (updateSongDto.metaTitle !== undefined) updateData.metaTitle = updateSongDto.metaTitle;
    if (updateSongDto.metaDescription !== undefined) updateData.metaDescription = updateSongDto.metaDescription;
    if (updateSongDto.tags !== undefined) updateData.tags = updateSongDto.tags;

    // Update song
    const updatedSong = await this.prisma.song.update({
      where: { id },
      data: updateData,
      include: {
        artist: true,
        language: true,
      },
    });

    // Invalidate specific song cache
    const songCacheKey = this.cacheService.createKey(CachePrefix.SONG, id);
    await this.cacheService.delete(songCacheKey);

    // Invalidate songs list cache
    await this.cacheService.deleteByPrefix(CachePrefix.SONGS);

    this.logger.debug(`Invalidated cache for song ${id} after update`);

    return updatedSong;
  }

  async remove(id: string): Promise<SongResponseDto> {
    // Check if song exists
    await this.findOne(id);

    // Delete song
    const deletedSong = await this.prisma.song.delete({
      where: { id },
      include: {
        artist: true,
        language: true,
      },
    });

    // Invalidate specific song cache
    const songCacheKey = this.cacheService.createKey(CachePrefix.SONG, id);
    await this.cacheService.delete(songCacheKey);

    // Invalidate songs list cache
    await this.cacheService.deleteByPrefix(CachePrefix.SONGS);

    this.logger.debug(`Invalidated cache for song ${id} after deletion`);

    return deletedSong;
  }
  
  /**
   * Check if a song exists by title
   * @param title The song title to check
   * @returns Boolean indicating if the song exists
   */
  async checkSongExists(title: string): Promise<boolean> {
    this.logger.debug(`Checking if song with title "${title}" exists`);
    
    // Create a cache key for this query
    const cacheKey = this.cacheService.createKey(CachePrefix.SONG_EXISTS, title);
    
    try {
      // Try to get from cache first with a short TTL
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          // Count songs with this exact title (case insensitive)
          const count = await this.prisma.song.count({
            where: {
              title: {
                equals: title,
                mode: 'insensitive',
              },
            },
          });
          
          return count > 0;
        },
        CacheTTL.SHORT // Use a short cache time for this check
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error checking if song exists: ${errorMessage}`, errorStack);
      // If there's an error, assume the song doesn't exist
      return false;
    }
  }

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
      this.logger.error(`Error exporting songs to CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to export songs to CSV');
    }
  }

  /**
   * Import songs from CSV buffer
   * @param buffer CSV file buffer
   * @returns Number of songs imported
   */
  async importFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    this.logger.log('Importing songs from CSV');

    try {
      // Parse CSV buffer
      const songs = await this.parseCsvBuffer(buffer);
      this.logger.log(`Parsed ${songs.length} songs from CSV`);

      const results = {
        imported: 0,
        errors: [] as string[],
      };

      // Process each song
      for (const songData of songs) {
        try {
          // Check if song already exists by ID
          if (songData.id) {
            const existingSong = await this.prisma.song.findUnique({
              where: { id: songData.id },
            });

            if (existingSong) {
              // Update existing song
              await this.update(songData.id, this.prepareSongDataForUpdate(songData));
              results.imported++;
              continue;
            }
          }

          // Create new song
          await this.create(this.prepareSongDataForCreate(songData));
          results.imported++;
        } catch (error: unknown) {
          const errorMessage = `Error importing song ${songData.title || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          results.errors.push(errorMessage);
        }
      }

      // Invalidate songs list cache
      await this.cacheService.deleteByPrefix(CachePrefix.SONGS);

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error importing songs from CSV: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to import songs from CSV');
    }
  }

  /**
   * Parse a CSV buffer into an array of song objects
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
   * Transform a song entity to a flat object for CSV export
   */
  private transformSongForCsv(song: any): Record<string, any> {
    // Extract tags as comma-separated string
    const tags = song.songTags
      ? song.songTags.map((st: any) => st.tag?.name).filter(Boolean).join(',')
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
      status: song.status || 'ACTIVE',
      chordSheet: song.chordSheet,
      imageUrl: song.imageUrl || '',
      tags: tags,
      viewCount: song.viewCount || 0,
      uniqueViewers: song.uniqueViewers || 0,
      createdAt: song.createdAt.toISOString(),
      updatedAt: song.updatedAt.toISOString(),
    };
  }

  /**
   * Prepare song data from CSV for create operation
   */
  private prepareSongDataForCreate(songData: any): CreateSongDto {
    return {
      title: songData.title,
      artistId: songData.artistId,
      languageId: songData.languageId || null,
      key: songData.key || null,
      tempo: songData.tempo ? parseInt(songData.tempo, 10) : undefined,
      timeSignature: songData.timeSignature || null,
      difficulty: songData.difficulty || null,
      capo: songData.capo ? parseInt(songData.capo, 10) : 0,
      status: songData.status || 'ACTIVE',
      chordSheet: songData.chordSheet,
      imageUrl: songData.imageUrl || null,
      officialVideoUrl: songData.officialVideoUrl || null,
      tutorialVideoUrl: songData.tutorialVideoUrl || null,
      tags: songData.tags ? songData.tags.split(',').map((tag: any) => tag.trim()) : [],
    };
  }

  /**
   * Prepare song data from CSV for update operation
   */
  private prepareSongDataForUpdate(songData: any): UpdateSongDto {
    return {
      title: songData.title,
      artistId: songData.artistId,
      languageId: songData.languageId || null,
      key: songData.key || null,
      tempo: songData.tempo ? parseInt(songData.tempo, 10) : undefined,
      timeSignature: songData.timeSignature || null,
      difficulty: songData.difficulty || null,
      capo: songData.capo ? parseInt(songData.capo, 10) : 0,
      status: songData.status || 'ACTIVE',
      chordSheet: songData.chordSheet,
      imageUrl: songData.imageUrl || null,
      officialVideoUrl: songData.officialVideoUrl || null,
      tutorialVideoUrl: songData.tutorialVideoUrl || null,
      tags: songData.tags ? songData.tags.split(',').map((tag: any) => tag.trim()) : [],
    };
  }
}
