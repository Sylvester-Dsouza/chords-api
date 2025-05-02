import { Module } from '@nestjs/common';
import { CustomerAuthController } from '../controllers/customer/customer-auth.controller';
import { CustomerAuthModule } from './customer-auth.module';

@Module({
  imports: [CustomerAuthModule],
  controllers: [CustomerAuthController],
})
export class AuthModule {}
