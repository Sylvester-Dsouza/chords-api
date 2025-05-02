import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Cache TTL values in seconds
 */
export enum CacheTTL {
  SHORT = 60, // 1 minute
  MEDIUM = 300, // 5 minutes
  LONG = 1800, // 30 minutes
  VERY_LONG = 3600, // 1 hour
  EXTRA_LONG = 86400, // 24 hours
}

/**
 * Cache key prefixes
 */
export enum CachePrefix {
  SONG = 'song:',
  SONGS = 'songs:',
  ARTIST = 'artist:',
  ARTISTS = 'artists:',
  COLLECTION = 'collection:',
  COLLECTIONS = 'collections:',
  TAG = 'tag:',
  TAGS = 'tags:',
  LANGUAGE = 'language:',
  LANGUAGES = 'languages:',
  CHORD = 'chord:',
  CHORDS = 'chords:',
  USER = 'user:',
  CUSTOMER = 'customer:',
  AUTH = 'auth:',
  STATS = 'stats:',
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly enabled: boolean;

  constructor(private readonly redisService: RedisService) {
    this.enabled = this.redisService.isReady();
    if (!this.enabled) {
      this.logger.warn('Redis is not available. Caching is disabled.');
    }
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }
    return this.redisService.get<T>(key);
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl The time-to-live in seconds
   */
  async set(key: string, value: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.redisService.set(key, value, ttl);
  }

  /**
   * Delete a value from the cache
   * @param key The cache key
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.redisService.delete(key);
  }

  /**
   * Delete all values with a specific prefix
   * @param prefix The key prefix
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.redisService.deleteByPattern(`${prefix}*`);
  }

  /**
   * Check if a key exists in the cache
   * @param key The cache key
   * @returns True if the key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    return this.redisService.exists(key);
  }

  /**
   * Get or set a value in the cache
   * @param key The cache key
   * @param factory A function that returns the value to cache if not found
   * @param ttl The time-to-live in seconds
   * @returns The cached value or the result of the factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<T> {
    if (!this.enabled) {
      return factory();
    }

    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Create a cache key with a prefix
   * @param prefix The key prefix
   * @param id The ID or unique identifier
   * @returns The cache key
   */
  createKey(prefix: CachePrefix, id: string): string {
    return `${prefix}${id}`;
  }

  /**
   * Create a cache key for a list with filters
   * @param prefix The key prefix
   * @param filters An object containing filter parameters
   * @returns The cache key
   */
  createListKey(prefix: CachePrefix, filters: Record<string, any> = {}): string {
    const filterString = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}:${value}`)
      .sort()
      .join('_');

    return `${prefix}list${filterString ? '_' + filterString : ''}`;
  }

  /**
   * Increment a counter in the cache
   * @param key The cache key
   * @param ttl The time-to-live in seconds
   * @returns The new counter value
   */
  async increment(key: string, ttl: number = CacheTTL.MEDIUM): Promise<number> {
    if (!this.enabled) {
      return 0;
    }
    return this.redisService.increment(key, ttl);
  }

  /**
   * Check if caching is enabled
   * @returns True if caching is enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
