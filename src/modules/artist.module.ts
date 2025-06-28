import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArtistController } from '../controllers/artist/artist.controller';
import { ArtistService } from '../services/artist.service';
import { PrismaService } from '../services/prisma.service';
import { CacheModule } from './cache.module';
import { UploadModule } from './upload.module';

@Module({
  imports: [ConfigModule, CacheModule, UploadModule],
  controllers: [ArtistController],
  providers: [ArtistService, PrismaService],
  exports: [ArtistService],
})
export class ArtistModule {}
