import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SongRequestController } from '../controllers/song-request/song-request.controller';
import { SongRequestService } from '../services/song-request.service';
import { PrismaService } from '../services/prisma.service';
import { NotificationModule } from './notification.module';

@Module({
  imports: [ConfigModule, NotificationModule],
  controllers: [SongRequestController],
  providers: [SongRequestService, PrismaService],
  exports: [SongRequestService],
})
export class SongRequestModule {}
