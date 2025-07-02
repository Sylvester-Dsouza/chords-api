import { Module } from '@nestjs/common';
import { FeatureRequestController } from '../controllers/feature-request/feature-request.controller';
import { FeatureRequestService } from '../services/feature-request.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [FeatureRequestController],
  providers: [FeatureRequestService, PrismaService],
  exports: [FeatureRequestService],
})
export class FeatureRequestModule {}
