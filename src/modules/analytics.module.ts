import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from '../controllers/analytics/analytics.controller';
import { TrackingController } from '../controllers/analytics/tracking.controller';
import { AnalyticsService } from '../services/analytics.service';
import { PrismaService } from '../services/prisma.service';
import { CacheService } from '../services/cache.service';
import { RedisService } from '../services/redis.service';

@Module({
  imports: [ConfigModule],
  controllers: [AnalyticsController, TrackingController],
  providers: [AnalyticsService, PrismaService, CacheService, RedisService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
