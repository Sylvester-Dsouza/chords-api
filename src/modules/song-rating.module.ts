import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SongRatingController } from '../controllers/song/song-rating.controller';
import { SongRatingService } from '../services/song-rating.service';
import { PrismaService } from '../services/prisma.service';
import { CacheService } from '../services/cache.service';
import { RedisService } from '../services/redis.service';

@Module({
  imports: [ConfigModule],
  controllers: [SongRatingController],
  providers: [SongRatingService, PrismaService, CacheService, RedisService],
  exports: [SongRatingService],
})
export class SongRatingModule {}
