import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaModule } from '../modules/prisma.module';
import { CacheModule } from '../modules/cache.module';
import { PrismaHealthIndicator } from './prisma.health';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrismaModule,
    CacheModule,
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
