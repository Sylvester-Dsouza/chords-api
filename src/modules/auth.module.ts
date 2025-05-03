import { Module } from '@nestjs/common';
import { CustomerAuthController } from '../controllers/customer/customer-auth.controller';
import { CustomerAuthModule } from './customer-auth.module';
import { PrismaService } from '../services/prisma.service';

@Module({
  imports: [CustomerAuthModule],
  controllers: [CustomerAuthController],
  providers: [PrismaService],
})
export class AuthModule {}
