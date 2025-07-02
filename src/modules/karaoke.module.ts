import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KaraokeController } from '../controllers/karaoke/karaoke.controller';
import { KaraokeService } from '../services/karaoke.service';
import { PrismaService } from '../services/prisma.service';
import { CacheModule } from './cache.module';
import { UploadModule } from './upload.module';

@Module({
  imports: [ConfigModule, CacheModule, UploadModule],
  controllers: [KaraokeController],
  providers: [KaraokeService, PrismaService],
  exports: [KaraokeService],
})
export class KaraokeModule {}
