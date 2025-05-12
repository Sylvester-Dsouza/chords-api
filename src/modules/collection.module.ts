import { Module } from '@nestjs/common';
import { CollectionController } from '../controllers/collection/collection.controller';
import { CollectionLikeController } from '../controllers/collection/collection-like.controller';
import { CollectionService } from '../services/collection.service';
import { CollectionLikeService } from '../services/collection-like.service';
import { PrismaService } from '../services/prisma.service';
import { UploadModule } from './upload.module';

@Module({
  imports: [UploadModule],
  controllers: [CollectionController, CollectionLikeController],
  providers: [CollectionService, CollectionLikeService, PrismaService],
  exports: [CollectionService, CollectionLikeService],
})
export class CollectionModule {}
