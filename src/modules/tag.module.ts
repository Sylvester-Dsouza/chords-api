import { Module } from '@nestjs/common';
import { TagController } from '../controllers/tag/tag.controller';
import { TagService } from '../services/tag.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [TagController],
  providers: [TagService, PrismaService],
  exports: [TagService],
})
export class TagModule {}
