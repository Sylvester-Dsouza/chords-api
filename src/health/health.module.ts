import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from '../modules/prisma.module';
import { CacheModule } from '../modules/cache.module';
import { PrismaHealthIndicator } from './prisma.health';
import { DatabaseProtectionService } from '../services/database-protection.service';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    ConfigModule,
    PrismaModule,
    CacheModule,
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, DatabaseProtectionService],
})
export class HealthModule {}
