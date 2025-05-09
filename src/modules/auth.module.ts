import { Module } from '@nestjs/common';
import { CustomerAuthController } from '../controllers/customer/customer-auth.controller';
import { CustomerAuthModule } from './customer-auth.module';
import { CacheModule } from './cache.module';
import { PrismaService } from '../services/prisma.service';
import { TokenService } from '../services/token.service';

@Module({
  imports: [CustomerAuthModule, CacheModule],
  controllers: [CustomerAuthController],
  providers: [PrismaService, TokenService],
})
export class AuthModule {}
