import { Controller, Get, Post, Query, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SystemMonitoringService } from '../../services/system-monitoring.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { CacheService, CachePrefix } from '../../services/cache.service';

@ApiTags('system')
@Controller('admin/system')
@UseGuards(UserAuthGuard)
@ApiBearerAuth()
export class SystemMonitoringController {
  constructor(
    private readonly systemMonitoringService: SystemMonitoringService,
    private readonly cacheService: CacheService
  ) {}

  @Get('performance')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'Returns system performance metrics' })
  async getPerformanceMetrics() {
    return this.systemMonitoringService.getPerformanceMetrics();
  }

  @Get('cache')
  @ApiOperation({ summary: 'Get cache metrics' })
  @ApiResponse({ status: 200, description: 'Returns cache metrics' })
  async getCacheMetrics() {
    return this.systemMonitoringService.getCacheMetrics();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200, description: 'Returns audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'severity', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      type,
      severity,
      userId,
      startDate,
      endDate,
    };

    return this.systemMonitoringService.getAuditLogs(+page, +limit, filters);
  }

  @Delete('cache/all')
  @ApiOperation({ summary: 'Clear all cache entries' })
  @ApiResponse({ status: 200, description: 'All cache entries cleared successfully' })
  async clearAllCache() {
    // Clear all cache entries for each prefix
    await Promise.all([
      this.cacheService.deleteByPrefix(CachePrefix.SONG),
      this.cacheService.deleteByPrefix(CachePrefix.SONGS),
      this.cacheService.deleteByPrefix(CachePrefix.ARTIST),
      this.cacheService.deleteByPrefix(CachePrefix.ARTISTS),
      this.cacheService.deleteByPrefix(CachePrefix.COLLECTION),
      this.cacheService.deleteByPrefix(CachePrefix.COLLECTIONS),
      this.cacheService.deleteByPrefix(CachePrefix.TAG),
      this.cacheService.deleteByPrefix(CachePrefix.TAGS),
      this.cacheService.deleteByPrefix(CachePrefix.LANGUAGE),
      this.cacheService.deleteByPrefix(CachePrefix.LANGUAGES),
      this.cacheService.deleteByPrefix(CachePrefix.CHORD),
      this.cacheService.deleteByPrefix(CachePrefix.CHORDS),
      this.cacheService.deleteByPrefix(CachePrefix.USER),
      this.cacheService.deleteByPrefix(CachePrefix.CUSTOMER),
      this.cacheService.deleteByPrefix(CachePrefix.STATS),
    ]);

    return { success: true, message: 'All cache entries cleared successfully' };
  }

  @Delete('cache/:prefix')
  @ApiOperation({ summary: 'Clear cache entries by prefix' })
  @ApiResponse({ status: 200, description: 'Cache entries cleared successfully' })
  @ApiParam({ name: 'prefix', description: 'Cache prefix to clear (e.g., song, artist, collection)' })
  async clearCacheByPrefix(@Param('prefix') prefix: string) {
    // Map the prefix to the corresponding CachePrefix enum
    let cachePrefix: string;

    switch (prefix.toLowerCase()) {
      case 'song':
        cachePrefix = CachePrefix.SONG;
        break;
      case 'songs':
        cachePrefix = CachePrefix.SONGS;
        break;
      case 'artist':
        cachePrefix = CachePrefix.ARTIST;
        break;
      case 'artists':
        cachePrefix = CachePrefix.ARTISTS;
        break;
      case 'collection':
        cachePrefix = CachePrefix.COLLECTION;
        break;
      case 'collections':
        cachePrefix = CachePrefix.COLLECTIONS;
        break;
      case 'tag':
        cachePrefix = CachePrefix.TAG;
        break;
      case 'tags':
        cachePrefix = CachePrefix.TAGS;
        break;
      case 'language':
        cachePrefix = CachePrefix.LANGUAGE;
        break;
      case 'languages':
        cachePrefix = CachePrefix.LANGUAGES;
        break;
      case 'chord':
        cachePrefix = CachePrefix.CHORD;
        break;
      case 'chords':
        cachePrefix = CachePrefix.CHORDS;
        break;
      case 'user':
        cachePrefix = CachePrefix.USER;
        break;
      case 'customer':
        cachePrefix = CachePrefix.CUSTOMER;
        break;
      case 'auth':
        cachePrefix = CachePrefix.AUTH;
        break;
      case 'stats':
        cachePrefix = CachePrefix.STATS;
        break;
      default:
        return { success: false, message: `Unknown cache prefix: ${prefix}` };
    }

    await this.cacheService.deleteByPrefix(cachePrefix);
    return { success: true, message: `Cache entries with prefix '${prefix}' cleared successfully` };
  }

  @Delete('cache/key/:key')
  @ApiOperation({ summary: 'Clear a specific cache key' })
  @ApiResponse({ status: 200, description: 'Cache key cleared successfully' })
  @ApiParam({ name: 'key', description: 'Cache key to clear' })
  async clearCacheKey(@Param('key') key: string) {
    await this.cacheService.delete(key);
    return { success: true, message: `Cache key '${key}' cleared successfully` };
  }
}
