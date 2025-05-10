import { Module } from '@nestjs/common';
import { HomeSectionController } from '../controllers/home/home-section.controller';
import { BannerItemController } from '../controllers/home/banner-item.controller';
import { HomeSectionService } from '../services/home-section.service';
import { BannerItemService } from '../services/banner-item.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [HomeSectionController, BannerItemController],
  providers: [HomeSectionService, BannerItemService, PrismaService],
  exports: [HomeSectionService, BannerItemService]
})
export class HomeSectionModule {}
