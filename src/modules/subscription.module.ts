import { Module } from '@nestjs/common';
import { SubscriptionController } from '../controllers/subscription/subscription.controller';
import { SubscriptionService } from '../services/subscription.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PrismaService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
