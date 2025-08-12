import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MultiTrackController } from '../controllers/multi-track/multi-track.controller';
import { MultiTrackService } from '../services/multi-track.service';
import { PrismaService } from '../services/prisma.service';
import { CacheModule } from './cache.module';
import { UploadModule } from './upload.module';

@Module({
  imports: [ConfigModule, CacheModule, UploadModule],
  controllers: [MultiTrackController],
  providers: [MultiTrackService, PrismaService],
  exports: [MultiTrackService],
})
export class MultiTrackModule {}
