import { Module } from '@nestjs/common';
import { ArtistController } from '../controllers/artist/artist.controller';
import { ArtistService } from '../services/artist.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [ArtistController],
  providers: [ArtistService, PrismaService],
  exports: [ArtistService],
})
export class ArtistModule {}
