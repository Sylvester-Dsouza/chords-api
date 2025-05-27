import { Module } from '@nestjs/common';
import { SetlistController } from '../controllers/setlist/setlist.controller';
import { SetlistService } from '../services/setlist.service';
import { PrismaService } from '../services/prisma.service';
import { CacheModule } from './cache.module';

@Module({
  imports: [CacheModule],
  controllers: [SetlistController],
  providers: [SetlistService, PrismaService],
  exports: [SetlistService],
})
export class SetlistModule {}
