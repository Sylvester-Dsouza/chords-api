import { Module } from '@nestjs/common';
import { AdsController } from '../controllers/ads/ads.controller';
import { AdsService } from '../services/ads.service';
import { PrismaService } from '../services/prisma.service';
import { SubscriptionService } from '../services/subscription.service';

@Module({
  controllers: [AdsController],
  providers: [AdsService, PrismaService, SubscriptionService],
  exports: [AdsService],
})
export class AdsModule {}
