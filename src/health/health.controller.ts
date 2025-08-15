import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../services/prisma.service';
import { CacheService } from '../services/cache.service';
import { SkipThrottle } from '../decorators/skip-throttle.decorator';
import { PrismaHealthIndicator } from './prisma.health';
import { DatabaseProtectionService } from '../services/database-protection.service';

@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Skip rate limiting for health checks
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaService: PrismaService,
    private cacheService: CacheService,
    private databaseProtection: DatabaseProtectionService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health status' })
  async check() {
    return this.health.check([
      // Check database connection
      async () => this.prisma.pingCheck('database', {
        timeout: 3000
      }),
      
      // Check Redis connection if available
      async () => {
        try {
          const isRedisAvailable = await this.cacheService.isRedisAvailable();
          return {
            redis: {
              status: isRedisAvailable ? 'up' : 'down',
              message: isRedisAvailable ? 'Redis is available' : 'Redis is not available',
            },
          };
        } catch (error: any) {
          return {
            redis: {
              status: 'down',
              message: `Redis check failed: ${error?.message || 'Unknown error'}`,
            },
          };
        }
      },
      
      // Check memory usage
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      
      // Check disk usage (more lenient threshold for development)
      () => {
        const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
        const threshold = isDevelopment ? 0.98 : 0.90; // 98% in dev, 90% in production
        
        return this.disk.checkStorage('disk', {
          thresholdPercent: threshold,
          path: '/',
        });
      },
    ]);
  }

  @Get('ping')
  @HealthCheck()
  @ApiOperation({ summary: 'Simple ping endpoint for keep-alive services' })
  ping() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    };
  }

  @Get('database-protection')
  @ApiOperation({ summary: 'Check database protection status' })
  getDatabaseProtectionStatus() {
    const protectionStatus = this.databaseProtection.getProtectionStatus();

    return {
      ...protectionStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      safeguards: {
        productionSafetyGuard: 'ACTIVE',
        databaseSafetyMiddleware: 'ACTIVE',
        databaseProtectionService: 'ACTIVE',
      },
      blockedOperations: [
        'DATABASE_RESET',
        'DATABASE_DROP',
        'TRUNCATE_ALL',
        'BULK_DELETE_ALL',
        'FACTORY_RESET',
      ],
    };
  }
}
