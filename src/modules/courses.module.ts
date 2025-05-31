import { Module } from '@nestjs/common';
import { CoursesController } from '../controllers/course/courses.controller';
import { CoursesService } from '../services/courses.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, PrismaService],
  exports: [CoursesService],
})
export class CoursesModule {}
