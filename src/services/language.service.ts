import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';
import { CreateLanguageDto, UpdateLanguageDto, LanguageResponseDto } from '../dto/language.dto';
import { Language } from '@prisma/client';

@Injectable()
export class LanguageService {
  private readonly logger = new Logger(LanguageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async create(createLanguageDto: CreateLanguageDto): Promise<LanguageResponseDto> {
    // Create the language
    const language = await this.prisma.language.create({
      data: createLanguageDto,
    });

    // Invalidate languages list cache
    await this.cacheService.deleteByPrefix(CachePrefix.LANGUAGES);
    this.logger.debug(`Invalidated languages list cache after creating language ${language.id}`);

    return language;
  }

  async findAll(onlyActive: boolean = false): Promise<LanguageResponseDto[]> {
    const cacheKey = `${CachePrefix.LANGUAGES}:all:${onlyActive}`;

    try {
      // Try to get from cache first
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for languages list with onlyActive=${onlyActive}`);

          const where: any = {};
          if (onlyActive) {
            where.isActive = true;
          }

          return this.prisma.language.findMany({
            where,
            orderBy: {
              name: 'asc',
            },
          });
        },
        CacheTTL.LONG // Languages don't change often
      );
    } catch (error: any) {
      this.logger.error(`Error fetching languages with onlyActive=${onlyActive}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const where: any = {};
      if (onlyActive) {
        where.isActive = true;
      }

      return this.prisma.language.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      });
    }
  }

  async findOne(id: string): Promise<LanguageResponseDto> {
    const cacheKey = `${CachePrefix.LANGUAGES}:${id}`;

    try {
      // Try to get from cache first
      return await this.cacheService.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for language ${id}, fetching from database`);
          const language = await this.prisma.language.findUnique({
            where: { id },
          });

          if (!language) {
            throw new NotFoundException(`Language with ID ${id} not found`);
          }

          return language;
        },
        CacheTTL.LONG // Languages don't change often
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching language ${id}: ${error.message}`);

      // Fallback to direct database query if cache fails
      const language = await this.prisma.language.findUnique({
        where: { id },
      });

      if (!language) {
        throw new NotFoundException(`Language with ID ${id} not found`);
      }

      return language;
    }
  }

  async update(id: string, updateLanguageDto: UpdateLanguageDto): Promise<LanguageResponseDto> {
    // Check if language exists
    await this.findOne(id);

    // Update language
    const updatedLanguage = await this.prisma.language.update({
      where: { id },
      data: updateLanguageDto,
    });

    // Invalidate language cache
    await this.cacheService.delete(`${CachePrefix.LANGUAGES}:${id}`);
    await this.cacheService.deleteByPrefix(CachePrefix.LANGUAGES);
    this.logger.debug(`Invalidated language cache for ${id} after update`);

    return updatedLanguage;
  }

  async remove(id: string): Promise<LanguageResponseDto> {
    // Check if language exists
    await this.findOne(id);

    // Check if language is used by any songs
    const songsCount = await this.prisma.song.count({
      where: { languageId: id },
    });

    if (songsCount > 0) {
      // Instead of deleting, mark as inactive
      return this.update(id, { isActive: false });
    }

    // Delete language
    const deletedLanguage = await this.prisma.language.delete({
      where: { id },
    });

    // Invalidate language cache
    await this.cacheService.delete(`${CachePrefix.LANGUAGES}:${id}`);
    await this.cacheService.deleteByPrefix(CachePrefix.LANGUAGES);
    this.logger.debug(`Invalidated language cache for ${id} after deletion`);

    return deletedLanguage;
  }
}
