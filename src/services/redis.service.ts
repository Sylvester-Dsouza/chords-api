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

    if (!redisUrl) {
      console.log('⚠️  Redis: DISABLED (REDIS_URL not found)');
      return;
    }

    try {
      this.logger.log(`Attempting to connect to Redis with URL: ${redisUrl.substring(0, 30)}...`);

      // For Upstash Redis, the password is included in the URL
      this.redisClient = new Redis(redisUrl, {
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.debug(`Redis retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: false, // Connect immediately
        keepAlive: 30000,
        enableReadyCheck: true,
      });

      this.redisClient.on('ready', () => {
        this.isConnected = true;
        console.log('✅ Redis: CONNECTED');
      });

      this.redisClient.on('error', (error: Error) => {
        this.isConnected = false;
        console.log(`❌ Redis: ERROR - ${error.message}`);
      });

      this.redisClient.on('close', () => {
        this.isConnected = false;
        console.log('⚠️  Redis: DISCONNECTED');
      });
    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize Redis client: ${error.message}`);
    }
  }

  async onModuleInit() {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.ping();
      this.isConnected = true;
    } catch (error: any) {
      this.isConnected = false;
      console.log(`❌ Redis: CONNECTION FAILED - ${error.message}`);
    }
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
    const hasClient = !!this.redisClient;
    const isConnected = this.isConnected;
    const ready = hasClient && isConnected;

    if (!ready) {
      this.logger.debug(`🔍 Redis ready check: client=${hasClient}, connected=${isConnected}, ready=${ready}`);
    }

    return ready;
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient.ping();
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
   * Get multiple values from Redis in a single operation
   * @param keys Array of keys to get
   * @returns Array of values (null for non-existent keys)
   */
  async getMultiple(keys: string[]): Promise<(any | null)[]> {
    if (!this.isReady() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.redisClient.mget(...keys);
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error: any) {
      this.logger.error(`Error getting multiple Redis keys: ${error.message}`);
      return keys.map(() => null);
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
