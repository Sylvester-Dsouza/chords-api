import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from '../controllers/media/media.controller';
import { MediaService } from '../services/media.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [MediaService, PrismaService],
  exports: [MediaService],
})
export class MediaModule {}
