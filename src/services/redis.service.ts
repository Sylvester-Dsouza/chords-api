import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient!: Redis;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    this.logger.debug(`Redis URL from config: ${redisUrl ? 'provided' : 'not provided'}`);

    if (!redisUrl) {
      this.logger.warn('Redis URL not provided. Redis caching will be disabled.');
      return;
    }

    try {
      this.logger.debug(`Attempting to connect to Redis with URL: ${redisUrl.substring(0, 20)}...`);

      // For Upstash Redis, the password is included in the URL
      this.redisClient = new Redis(redisUrl, {
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Successfully connected to Redis');
      });

      this.redisClient.on('error', (error: Error) => {
        this.isConnected = false;
        this.logger.error(`Redis connection error: ${error.message}`);
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.log('Reconnecting to Redis...');
      });
    } catch (error: any) {
      this.logger.error(`Failed to initialize Redis client: ${error.message}`);
    }
  }

  async onModuleInit() {
    // Test connection on startup
    this.logger.debug(`onModuleInit: Redis client ${this.redisClient ? 'exists' : 'does not exist'}`);

    if (this.redisClient) {
      try {
        this.logger.debug('Attempting to ping Redis server...');
        await this.redisClient.ping();
        this.logger.log('Redis connection test successful');
        this.isConnected = true;
      } catch (error: any) {
        this.logger.error(`Redis connection test failed: ${error.message}`);
        this.isConnected = false;
      }
    } else {
      this.logger.warn('Redis client not initialized during module init');
    }

    this.logger.debug(`Redis connection status: ${this.isConnected ? 'connected' : 'disconnected'}`);
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Check if Redis is connected and available
   */
  isReady(): boolean {
    const ready = this.redisClient && this.isConnected;
    this.logger.debug(`Redis ready check: client=${!!this.redisClient}, connected=${this.isConnected}, ready=${ready}`);
    return ready;
  }

  /**
   * Set a value in Redis with an expiration time
   * @param key The key to set
   * @param value The value to set
   * @param ttlSeconds Time to live in seconds
   */
  async set(key: string, value: string | object, ttlSeconds: number): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redisClient.set(key, serializedValue, 'EX', ttlSeconds);
    } catch (error: any) {
      this.logger.error(`Error setting Redis key ${key}: ${error.message}`);
    }
  }

  /**
   * Get a value from Redis
   * @param key The key to get
   * @returns The value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error: any) {
      this.logger.error(`Error getting Redis key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a key from Redis
   * @param key The key to delete
   */
  async delete(key: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.redisClient.del(key);
    } catch (error: any) {
      this.logger.error(`Error deleting Redis key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern The pattern to match (e.g., "user:*")
   */
  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Deleted ${keys.length} keys matching pattern ${pattern}`);
      }
    } catch (error: any) {
      this.logger.error(`Error deleting Redis keys with pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Check if a key exists in Redis
   * @param key The key to check
   * @returns True if the key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error: any) {
      this.logger.error(`Error checking if Redis key ${key} exists: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the TTL of a key in seconds
   * @param key The key to check
   * @returns The TTL in seconds, or -1 if the key has no TTL, or -2 if the key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      return -2;
    }

    try {
      return await this.redisClient.ttl(key);
    } catch (error: any) {
      this.logger.error(`Error getting TTL for Redis key ${key}: ${error.message}`);
      return -2;
    }
  }

  /**
   * Increment a counter in Redis
   * @param key The key to increment
   * @param ttlSeconds Time to live in seconds (only set if the key doesn't exist)
   * @returns The new value
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const value = await this.redisClient.incr(key);

      // Set expiration if provided and the key was just created (value === 1)
      if (ttlSeconds && value === 1) {
        await this.redisClient.expire(key, ttlSeconds);
      }

      return value;
    } catch (error: any) {
      this.logger.error(`Error incrementing Redis key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get the Redis client for advanced operations
   * @returns The Redis client
   */
  getClient(): Redis | null {
    return this.isReady() ? this.redisClient : null;
  }

  /**
   * Get Redis server info
   * @returns Redis INFO command output
   */
  async getInfo(): Promise<string> {
    if (!this.isReady()) {
      return '';
    }

    try {
      return await this.redisClient.info();
    } catch (error: any) {
      this.logger.error(`Error getting Redis info: ${error.message}`);
      return '';
    }
  }
}
