import { Module } from '@nestjs/common';
import { SetlistController } from '../controllers/setlist/setlist.controller';
import { SetlistService } from '../services/setlist.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [SetlistController],
  providers: [SetlistService, PrismaService],
  exports: [SetlistService],
})
export class SetlistModule {}
