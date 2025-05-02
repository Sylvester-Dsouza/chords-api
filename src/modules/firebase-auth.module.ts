import { Module } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { CustomerAuthService } from '../services/customer-auth.service';

@Module({
  providers: [PrismaService, CustomerAuthService],
  exports: [PrismaService, CustomerAuthService],
})
export class FirebaseAuthModule {}
