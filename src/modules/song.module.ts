import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SongController } from '../controllers/song/song.controller';
import { SongService } from '../services/song.service';
import { PrismaService } from '../services/prisma.service';
import { CacheService } from '../services/cache.service';
import { RedisService } from '../services/redis.service';

@Module({
  imports: [ConfigModule],
  controllers: [SongController],
  providers: [SongService, PrismaService, CacheService, RedisService],
  exports: [SongService],
})
export class SongModule {}
