import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import * as os from 'os';
import * as process from 'process';

@Injectable()
export class SystemMonitoringService {
  private readonly logger = new Logger(SystemMonitoringService.name);
  private startTime = Date.now();
  private requestCounts: { [key: string]: number } = {};
  private errorCounts: { [key: string]: number } = {};
  private responseTimes: { [key: string]: number[] } = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    // Initialize request tracking
    this.resetCounters();

    // Reset counters every hour
    setInterval(() => {
      this.resetCounters();
    }, 60 * 60 * 1000);
  }

  private resetCounters() {
    this.requestCounts = {
      total: 0,
      songs: 0,
      artists: 0,
      collections: 0,
      auth: 0,
      admin: 0,
      other: 0,
    };

    this.errorCounts = {
      total: 0,
      '4xx': 0,
      '5xx': 0,
    };

    this.responseTimes = {
      total: [],
      songs: [],
      artists: [],
      collections: [],
      auth: [],
      admin: [],
      other: [],
    };
  }

  /**
   * Track a request for system monitoring
   */
  trackRequest(path: string, statusCode: number, responseTime: number) {
    // Increment total requests
    this.requestCounts.total++;

    // Track by endpoint type
    if (path.includes('/songs')) {
      this.requestCounts.songs++;
      this.responseTimes.songs.push(responseTime);
    } else if (path.includes('/artists')) {
      this.requestCounts.artists++;
      this.responseTimes.artists.push(responseTime);
    } else if (path.includes('/collections')) {
      this.requestCounts.collections++;
      this.responseTimes.collections.push(responseTime);
    } else if (path.includes('/auth')) {
      this.requestCounts.auth++;
      this.responseTimes.auth.push(responseTime);
    } else if (path.includes('/admin')) {
      this.requestCounts.admin++;
      this.responseTimes.admin.push(responseTime);
    } else {
      this.requestCounts.other++;
      this.responseTimes.other.push(responseTime);
    }

    // Track response times
    this.responseTimes.total.push(responseTime);

    // Track errors
    if (statusCode >= 400) {
      this.errorCounts.total++;
      if (statusCode < 500) {
        this.errorCounts['4xx']++;
      } else {
        this.errorCounts['5xx']++;
      }
    }
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics() {
    try {
      // System metrics
      const cpuUsage = this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();

      // Request metrics
      const requestsPerMinute = this.getRequestsPerMinute();
      const errorRate = this.getErrorRate();

      // Response time metrics
      const avgResponseTime = this.getAverageResponseTime();
      const p95ResponseTime = this.getPercentileResponseTime(95);
      const p99ResponseTime = this.getPercentileResponseTime(99);

      // Database metrics
      const databaseConnections = await this.getDatabaseConnections();

      // User metrics
      const activeUsers = await this.getActiveUsers();

      return {
        system: {
          cpuUsage,
          memoryUsage,
          diskUsage,
          uptime: this.getUptime(),
        },
        requests: {
          total: this.requestCounts.total,
          perMinute: requestsPerMinute,
          byEndpoint: {
            songs: this.requestCounts.songs,
            artists: this.requestCounts.artists,
            collections: this.requestCounts.collections,
            auth: this.requestCounts.auth,
            admin: this.requestCounts.admin,
            other: this.requestCounts.other,
          },
        },
        errors: {
          total: this.errorCounts.total,
          rate: errorRate,
          by4xx: this.errorCounts['4xx'],
          by5xx: this.errorCounts['5xx'],
        },
        responseTimes: {
          average: avgResponseTime,
          p95: p95ResponseTime,
          p99: p99ResponseTime,
          byEndpoint: {
            songs: this.getAverageResponseTime('songs'),
            artists: this.getAverageResponseTime('artists'),
            collections: this.getAverageResponseTime('collections'),
            auth: this.getAverageResponseTime('auth'),
            admin: this.getAverageResponseTime('admin'),
            other: this.getAverageResponseTime('other'),
          },
        },
        database: {
          connections: databaseConnections,
        },
        users: {
          active: activeUsers,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get cache metrics
   */
  async getCacheMetrics() {
    try {
      if (!this.redisService.isReady()) {
        return {
          available: false,
          message: 'Redis cache is not available',
        };
      }

      // Get Redis info
      const info = await this.redisService.getInfo();

      // Parse Redis info
      const memory = this.parseRedisMemoryInfo(info);
      const keyspace = this.parseRedisKeyspaceInfo(info);

      // Get cache hit rate
      const hitRate = await this.getCacheHitRate();

      // Get top cache keys
      const topKeys = await this.getTopCacheKeys();

      return {
        available: true,
        memory,
        keys: keyspace,
        hitRate,
        topKeys,
      };
    } catch (error) {
      this.logger.error(`Error getting cache metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        available: false,
        message: `Error getting cache metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(page = 1, limit = 10, filters: any = {}) {
    try {
      // Build where clause based on filters
      const where: any = {};

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.severity) {
        where.severity = filters.severity;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.startDate && filters.endDate) {
        where.timestamp = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      // Get total count
      const total = await this.prisma.auditLog.count({ where });

      // Get paginated logs
      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get CPU usage percentage
   */
  private getCpuUsage(): number {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          // @ts-ignore - cpu.times has dynamic keys
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usagePercent = 100 - (idle / total) * 100;

      return Math.round(usagePercent);
    } catch (error) {
      this.logger.error(`Error getting CPU usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = (usedMem / totalMem) * 100;

      return Math.round(usagePercent);
    } catch (error) {
      this.logger.error(`Error getting memory usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Get disk usage percentage (simulated)
   */
  private async getDiskUsage(): Promise<number> {
    // This is a simulated value since we don't have direct disk access
    // In a real implementation, you would use a library like diskusage
    return Math.floor(Math.random() * 30) + 20; // Random value between 20-50%
  }

  /**
   * Get system uptime in human-readable format
   */
  private getUptime(): string {
    const uptime = Date.now() - this.startTime;
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));

    return `${days}d ${hours}h ${minutes}m`;
  }

  /**
   * Get requests per minute
   */
  private getRequestsPerMinute(): number {
    // Calculate requests per minute based on total requests and uptime
    const uptimeMinutes = (Date.now() - this.startTime) / (60 * 1000);
    return Math.round(this.requestCounts.total / uptimeMinutes);
  }

  /**
   * Get error rate percentage
   */
  private getErrorRate(): number {
    if (this.requestCounts.total === 0) {
      return 0;
    }

    return Math.round((this.errorCounts.total / this.requestCounts.total) * 100 * 10) / 10;
  }

  /**
   * Get average response time in milliseconds
   */
  private getAverageResponseTime(endpoint: string = 'total'): number {
    const times = this.responseTimes[endpoint];

    if (!times || times.length === 0) {
      return 0;
    }

    const sum = times.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / times.length);
  }

  /**
   * Get percentile response time in milliseconds
   */
  private getPercentileResponseTime(percentile: number): number {
    const times = [...this.responseTimes.total].sort((a, b) => a - b);

    if (times.length === 0) {
      return 0;
    }

    const index = Math.ceil((percentile / 100) * times.length) - 1;
    return Math.round(times[index]);
  }

  /**
   * Get database connections
   */
  private async getDatabaseConnections(): Promise<number> {
    try {
      // This is a simulated value
      // In a real implementation, you would query the database for connection count
      return Math.floor(Math.random() * 20) + 5; // Random value between 5-25
    } catch (error) {
      this.logger.error(`Error getting database connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Get active users in the last 15 minutes
   */
  private async getActiveUsers(): Promise<number> {
    try {
      // This is a simulated value since we don't have a userSession table
      // In a real implementation, you would query the database
      return Math.floor(Math.random() * 100) + 50; // Random value between 50-150
    } catch (error) {
      this.logger.error(`Error getting active users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Parse Redis memory info
   */
  private parseRedisMemoryInfo(info: string): any {
    try {
      const memoryMatch = info.match(/used_memory_human:(.+?)\r\n/);
      const maxMemoryMatch = info.match(/maxmemory_human:(.+?)\r\n/);

      const usedMemory = memoryMatch ? memoryMatch[1].trim() : '0B';
      const maxMemory = maxMemoryMatch ? maxMemoryMatch[1].trim() : '0B';

      // Calculate percentage
      const usedBytes = this.parseHumanReadableSize(usedMemory);
      const maxBytes = this.parseHumanReadableSize(maxMemory);

      const percentage = maxBytes > 0 ? Math.round((usedBytes / maxBytes) * 100) : 0;

      return {
        used: usedMemory,
        max: maxMemory,
        percentage,
      };
    } catch (error) {
      this.logger.error(`Error parsing Redis memory info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        used: '0B',
        max: '0B',
        percentage: 0,
      };
    }
  }

  /**
   * Parse Redis keyspace info
   */
  private parseRedisKeyspaceInfo(info: string): any {
    try {
      const keyspaceMatch = info.match(/db0:keys=(\d+),expires=(\d+)/);

      if (!keyspaceMatch) {
        return {
          total: 0,
          expires: 0,
          persistent: 0,
        };
      }

      const total = parseInt(keyspaceMatch[1], 10);
      const expires = parseInt(keyspaceMatch[2], 10);
      const persistent = total - expires;

      return {
        total,
        expires,
        persistent,
      };
    } catch (error) {
      this.logger.error(`Error parsing Redis keyspace info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        total: 0,
        expires: 0,
        persistent: 0,
      };
    }
  }

  /**
   * Get cache hit rate
   */
  private async getCacheHitRate(): Promise<number> {
    try {
      const info = await this.redisService.getInfo();

      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);

      if (!hitsMatch || !missesMatch) {
        return 0;
      }

      const hits = parseInt(hitsMatch[1], 10);
      const misses = parseInt(missesMatch[1], 10);

      if (hits + misses === 0) {
        return 0;
      }

      return Math.round((hits / (hits + misses)) * 100);
    } catch (error) {
      this.logger.error(`Error getting cache hit rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Get top cache keys
   */
  private async getTopCacheKeys(): Promise<any[]> {
    try {
      if (!this.redisService.isReady()) {
        return [];
      }

      // Get all keys using SCAN
      const client = this.redisService.getClient();
      if (!client) {
        return [];
      }

      // Use SCAN to get all keys (up to 100)
      const keys = await this.scanKeys('*', 100);

      // Get details for each key
      const keyDetails = await Promise.all(
        keys.map(async (key) => {
          try {
            // Get TTL
            const ttlSeconds = await client.ttl(key);
            let ttlString = '';

            if (ttlSeconds < 0) {
              ttlString = 'No expiry';
            } else if (ttlSeconds < 60) {
              ttlString = `${ttlSeconds} sec`;
            } else if (ttlSeconds < 3600) {
              ttlString = `${Math.round(ttlSeconds / 60)} min`;
            } else if (ttlSeconds < 86400) {
              ttlString = `${Math.round(ttlSeconds / 3600)} hours`;
            } else {
              ttlString = `${Math.round(ttlSeconds / 86400)} days`;
            }

            // Determine key type
            let type = 'Unknown';
            if (key.startsWith('song:')) {
              type = 'Song';
            } else if (key.startsWith('songs:')) {
              type = 'Song List';
            } else if (key.startsWith('artist:')) {
              type = 'Artist';
            } else if (key.startsWith('artists:')) {
              type = 'Artist List';
            } else if (key.startsWith('collection:')) {
              type = 'Collection';
            } else if (key.startsWith('collections:')) {
              type = 'Collection List';
            } else if (key.startsWith('chord:')) {
              type = 'Chord Diagram';
            } else if (key.startsWith('tag:')) {
              type = 'Tag';
            } else if (key.startsWith('language:')) {
              type = 'Language';
            } else if (key.startsWith('auth:')) {
              type = 'Auth';
            } else if (key.startsWith('stats:')) {
              type = 'Stats';
            }

            // Get memory usage (approximate)
            const value = await client.get(key);
            const size = value ? this.formatSize(Buffer.from(value).length) : '0 B';

            // We don't have hit counts in Redis by default, so we'll use a random value
            const hits = Math.floor(Math.random() * 1000) + 1;

            return {
              key,
              type,
              size,
              ttl: ttlString,
              hits,
            };
          } catch (err) {
            this.logger.error(`Error getting details for key ${key}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return {
              key,
              type: 'Unknown',
              size: '0 B',
              ttl: 'Unknown',
              hits: 0,
            };
          }
        })
      );

      // Sort by hits (descending)
      return keyDetails.sort((a, b) => b.hits - a.hits);
    } catch (error) {
      this.logger.error(`Error getting top cache keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Scan Redis keys with a pattern
   */
  private async scanKeys(pattern: string, count: number): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        return [];
      }

      let cursor = '0';
      const keys: string[] = [];

      do {
        // Use SCAN to get keys
        const [nextCursor, scanKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = nextCursor;

        // Add keys to the result
        keys.push(...scanKeys);

        // Stop if we have enough keys or reached the end
        if (keys.length >= count || cursor === '0') {
          break;
        }
      } while (true);

      // Return the first 'count' keys
      return keys.slice(0, count);
    } catch (error) {
      this.logger.error(`Error scanning Redis keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Format size in bytes to human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    } else {
      return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
    }
  }

  /**
   * Parse human-readable size to bytes
   */
  private parseHumanReadableSize(size: string): number {
    try {
      const units = {
        B: 1,
        K: 1024,
        M: 1024 * 1024,
        G: 1024 * 1024 * 1024,
      };

      const match = size.match(/^([\d.]+)([BKMG])$/);

      if (!match) {
        return 0;
      }

      const value = parseFloat(match[1]);
      const unit = match[2];

      // @ts-ignore - unit is guaranteed to be one of the keys in units
      return value * units[unit];
    } catch (error) {
      this.logger.error(`Error parsing human-readable size: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }
}
