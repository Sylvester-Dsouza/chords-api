import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../services/redis.service';
import { CacheService } from '../services/cache.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService],
})
export class CacheModule {}
