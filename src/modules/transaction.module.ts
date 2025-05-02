import { Module } from '@nestjs/common';
import { TransactionController } from '../controllers/transaction/transaction.controller';
import { TransactionService } from '../services/transaction.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService, PrismaService],
  exports: [TransactionService],
})
export class TransactionModule {}
