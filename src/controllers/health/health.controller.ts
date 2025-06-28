import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RedisService } from '../../services/redis.service';
import { CacheService } from '../../services/cache.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly cacheService: CacheService,
  ) {}
  @Get()
  @ApiOperation({ summary: 'Check API health' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping API endpoint' })
  @ApiResponse({ status: 200, description: 'API is responding' })
  ping() {
    return {
      status: 'ok',
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis connection status' })
  @ApiResponse({ status: 200, description: 'Redis status information' })
  async checkRedis() {
    const isReady = this.redisService.isReady();
    const isCacheEnabled = this.cacheService.isCacheEnabled();

    let pingResult = null;
    let testResult = null;

    if (isReady) {
      try {
        // Test Redis ping
        pingResult = await this.redisService.ping();

        // Test cache operations
        const testKey = 'health:test';
        await this.cacheService.set(testKey, 'test-value', 10);
        testResult = await this.cacheService.get(testKey);
        await this.cacheService.delete(testKey);
      } catch (error: any) {
        testResult = `Error: ${error.message}`;
      }
    }

    return {
      status: isReady ? 'connected' : 'disconnected',
      redis: {
        ready: isReady,
        cacheEnabled: isCacheEnabled,
        ping: pingResult,
        testOperation: testResult,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
