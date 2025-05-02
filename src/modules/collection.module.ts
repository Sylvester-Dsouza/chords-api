import { Module } from '@nestjs/common';
import { CollectionController } from '../controllers/collection/collection.controller';
import { CollectionService } from '../services/collection.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [CollectionController],
  providers: [CollectionService, PrismaService],
  exports: [CollectionService],
})
export class CollectionModule {}
