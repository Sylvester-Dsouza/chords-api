import { Module } from '@nestjs/common';
import { SubscriptionPlanController } from '../controllers/subscription-plan/subscription-plan.controller';
import { SubscriptionPlanService } from '../services/subscription-plan.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService, PrismaService],
  exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
