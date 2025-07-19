import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TimezoneService {
  private readonly logger = new Logger(TimezoneService.name);
  private timezoneCache: string[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(private prisma: PrismaService) {}

  /**
   * Get all timezone names with caching
   * This replaces the slow pg_timezone_names query
   */
  async getTimezones(): Promise<string[]> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.timezoneCache && now < this.cacheExpiry) {
      this.logger.debug('Returning cached timezone data');
      return this.timezoneCache;
    }

    try {
      // Try to get from cached table first
      const cachedTimezones = await this.getCachedTimezones();
      if (cachedTimezones.length > 0) {
        this.timezoneCache = cachedTimezones;
        this.cacheExpiry = now + this.CACHE_DURATION;
        this.logger.log(`Loaded ${cachedTimezones.length} timezones from cache table`);
        return cachedTimezones;
      }

      // Fallback to optimized pg_timezone_names query
      this.logger.warn('Cache table empty, falling back to pg_timezone_names');
      const timezones = await this.getTimezonesFromSystem();
      
      // Cache the results
      this.timezoneCache = timezones;
      this.cacheExpiry = now + this.CACHE_DURATION;
      
      // Populate cache table for next time (fire and forget)
      this.populateCacheTable(timezones).catch((error: unknown) => {
        this.logger.error('Failed to populate timezone cache table:', error instanceof Error ? error.message : String(error));
      });

      return timezones;
    } catch (error: unknown) {
      this.logger.error('Error fetching timezones:', error instanceof Error ? error.message : String(error));
      
      // Return hardcoded common timezones as ultimate fallback
      return this.getCommonTimezones();
    }
  }

  /**
   * Get timezones from cached table (fastest)
   */
  private async getCachedTimezones(): Promise<string[]> {
    try {
      const result = await this.prisma.$queryRaw<{ name: string }[]>`
        SELECT name FROM cached_timezones ORDER BY name
      `;
      return result.map(row => row.name);
    } catch (error: unknown) {
      this.logger.debug('Cached timezone table not available:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get timezones from system view with optimization (slower but comprehensive)
   */
  private async getTimezonesFromSystem(): Promise<string[]> {
    const result = await this.prisma.$queryRaw<{ name: string }[]>`
      SELECT name 
      FROM pg_timezone_names 
      WHERE name ~ '^[A-Z][a-z]+/[A-Z]'  -- Only major city timezones
      AND name NOT LIKE '%/%/%'  -- Exclude sub-regions
      AND name NOT LIKE 'Etc/%'  -- Exclude Etc zones
      ORDER BY name
      LIMIT 100
    `;
    return result.map(row => row.name);
  }

  /**
   * Populate cache table with timezone data
   */
  private async populateCacheTable(timezones: string[]): Promise<void> {
    try {
      // Create table if it doesn't exist
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS cached_timezones (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Create index if it doesn't exist
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_cached_timezones_name ON cached_timezones(name)
      `;

      // Insert timezones
      for (const timezone of timezones) {
        await this.prisma.$executeRaw`
          INSERT INTO cached_timezones (name) VALUES (${timezone})
          ON CONFLICT (name) DO NOTHING
        `;
      }

      this.logger.log(`Populated cache table with ${timezones.length} timezones`);
    } catch (error: unknown) {
      this.logger.error('Error populating cache table:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Hardcoded common timezones as ultimate fallback
   */
  private getCommonTimezones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'America/Mexico_City',
      'America/Sao_Paulo',
      'America/Argentina/Buenos_Aires',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Europe/Amsterdam',
      'Europe/Stockholm',
      'Europe/Moscow',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Seoul',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Bangkok',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Jerusalem',
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Lagos',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Perth',
      'Pacific/Auckland',
      'Pacific/Honolulu',
      'Pacific/Fiji'
    ].sort();
  }

  /**
   * Clear timezone cache (for testing or manual refresh)
   */
  async clearCache(): Promise<void> {
    this.timezoneCache = null;
    this.cacheExpiry = 0;
    this.logger.log('Timezone cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: boolean; expiresIn: number; count: number } {
    const now = Date.now();
    return {
      cached: this.timezoneCache !== null && now < this.cacheExpiry,
      expiresIn: Math.max(0, this.cacheExpiry - now),
      count: this.timezoneCache?.length || 0
    };
  }
}
