import { Module } from '@nestjs/common';
import { AccountDeletionRequestController } from '../controllers/customer/account-deletion-request.controller';
import { AccountDeletionRequestService } from '../services/account-deletion-request.service';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountDeletionRequestController],
  providers: [AccountDeletionRequestService],
  exports: [AccountDeletionRequestService],
})
export class AccountDeletionModule {}