import { Module } from '@nestjs/common';
import { VocalController } from '../controllers/vocal/vocal.controller';
import { VocalService } from '../services/vocal.service';
import { PrismaService } from '../services/prisma.service';
import { CacheModule } from './cache.module';

@Module({
  imports: [CacheModule],
  controllers: [VocalController],
  providers: [VocalService, PrismaService],
  exports: [VocalService],
})
export class VocalModule {}
