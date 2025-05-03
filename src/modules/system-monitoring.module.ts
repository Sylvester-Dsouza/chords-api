import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SystemMonitoringService } from '../services/system-monitoring.service';
import { SystemMonitoringController } from '../controllers/system/system-monitoring.controller';
import { AuthDebugController } from '../controllers/system/auth-debug.controller';
import { RequestTrackingMiddleware } from '../middlewares/request-tracking.middleware';
import { PrismaService } from '../services/prisma.service';
import { RedisService } from '../services/redis.service';
import { CacheService } from '../services/cache.service';

@Module({
  imports: [ConfigModule],
  controllers: [SystemMonitoringController, AuthDebugController],
  providers: [SystemMonitoringService, PrismaService, RedisService, CacheService],
  exports: [SystemMonitoringService],
})
export class SystemMonitoringModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestTrackingMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
