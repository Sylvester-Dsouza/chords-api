import { Module } from '@nestjs/common';
import { CommunityController } from '../controllers/community/community.controller';
import { CommunityService } from '../services/community.service';
import { CacheModule } from './cache.module';

@Module({
  imports: [CacheModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
