import { Module } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { CustomerAuthService } from '../services/customer-auth.service';
import { CustomerAuthGuard } from '../guards/customer-auth.guard';
import { CustomerAuthController } from '../controllers/customer/customer-auth.controller';

@Module({
  controllers: [CustomerAuthController],
  providers: [PrismaService, CustomerAuthService, CustomerAuthGuard],
  exports: [CustomerAuthService, CustomerAuthGuard],
})
export class CustomerAuthModule {}
