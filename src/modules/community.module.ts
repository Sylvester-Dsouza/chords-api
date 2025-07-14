import { Module } from '@nestjs/common';
import { CommunityController } from '../controllers/setlist/community-setlist.controller';
import { CommunityService } from '../services/community-setlist.service';
import { CacheModule } from './cache.module';

@Module({
  imports: [CacheModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
