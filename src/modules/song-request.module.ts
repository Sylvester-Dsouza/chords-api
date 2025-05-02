import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SongRequestController } from '../controllers/song-request/song-request.controller';
import { SongRequestService } from '../services/song-request.service';
import { PrismaService } from '../services/prisma.service';
import { NotificationService } from '../services/notification.service';

@Module({
  imports: [ConfigModule],
  controllers: [SongRequestController],
  providers: [SongRequestService, PrismaService, NotificationService],
  exports: [SongRequestService],
})
export class SongRequestModule {}
