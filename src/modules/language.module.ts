import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LanguageController } from '../controllers/language/language.controller';
import { LanguageService } from '../services/language.service';
import { PrismaService } from '../services/prisma.service';
import { CacheService } from '../services/cache.service';
import { RedisService } from '../services/redis.service';

@Module({
  imports: [ConfigModule],
  controllers: [LanguageController],
  providers: [LanguageService, PrismaService, CacheService, RedisService],
  exports: [LanguageService],
})
export class LanguageModule {}
