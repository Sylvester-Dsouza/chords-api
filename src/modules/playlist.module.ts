import { Module } from '@nestjs/common';
import { PlaylistController } from '../controllers/playlist/playlist.controller';
import { PlaylistService } from '../services/playlist.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [PlaylistController],
  providers: [PlaylistService, PrismaService],
  exports: [PlaylistService],
})
export class PlaylistModule {}
