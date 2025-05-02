import { Module } from '@nestjs/common';
import { LikedSongController } from '../controllers/liked-song/liked-song.controller';
import { LikedSongService } from '../services/liked-song.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [LikedSongController],
  providers: [LikedSongService, PrismaService],
  exports: [LikedSongService],
})
export class LikedSongModule {}
