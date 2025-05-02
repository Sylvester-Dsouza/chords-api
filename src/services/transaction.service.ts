import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionResponseDto } from '../dto/transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<TransactionResponseDto> {
    try {
      // Check if subscription exists
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: createTransactionDto.subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${createTransactionDto.subscriptionId} not found`);
      }

      // Check if customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: createTransactionDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${createTransactionDto.customerId} not found`);
      }

      // Check if plan exists
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: createTransactionDto.planId },
      });

      if (!plan) {
        throw new NotFoundException(`Subscription plan with ID ${createTransactionDto.planId} not found`);
      }

      // Create the transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          ...createTransactionDto,
          transactionDate: createTransactionDto.transactionDate || new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      return transaction;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to create transaction: ${errorMessage}`);
    }
  }

  async findAll(
    status?: string,
    customerId?: string,
    planId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TransactionResponseDto[]> {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (planId) {
      where.planId = planId;
    }

    if (startDate || endDate) {
      where.transactionDate = {};

      if (startDate) {
        where.transactionDate.gte = startDate;
      }

      if (endDate) {
        where.transactionDate.lte = endDate;
      }
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: {
        transactionDate: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<TransactionResponseDto> {
    try {
      // Check if transaction exists
      const existingTransaction = await this.prisma.transaction.findUnique({
        where: { id },
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      // Update the transaction
      const updatedTransaction = await this.prisma.transaction.update({
        where: { id },
        data: updateTransactionDto,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      return updatedTransaction;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to update transaction: ${errorMessage}`);
    }
  }

  async remove(id: string): Promise<TransactionResponseDto> {
    try {
      // Check if transaction exists
      const existingTransaction = await this.prisma.transaction.findUnique({
        where: { id },
      });

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      // Delete the transaction
      const deletedTransaction = await this.prisma.transaction.delete({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      return deletedTransaction;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete transaction: ${errorMessage}`);
    }
  }

  async getSubscriptionTransactions(subscriptionId: string): Promise<TransactionResponseDto[]> {
    return this.prisma.transaction.findMany({
      where: {
        subscriptionId,
      },
      orderBy: {
        transactionDate: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }

  async getCustomerTransactions(customerId: string): Promise<TransactionResponseDto[]> {
    return this.prisma.transaction.findMany({
      where: {
        customerId,
      },
      orderBy: {
        transactionDate: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }

  async getRevenueStats(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.transactionDate = {};

      if (startDate) {
        where.transactionDate.gte = startDate;
      }

      if (endDate) {
        where.transactionDate.lte = endDate;
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        plan: true,
      },
    });

    // Calculate total revenue
    const totalRevenue = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Calculate revenue by plan
    const revenueByPlan: Record<string, number> = {};
    transactions.forEach(transaction => {
      const planName = transaction.plan.name;
      if (!revenueByPlan[planName]) {
        revenueByPlan[planName] = 0;
      }
      revenueByPlan[planName] += transaction.amount;
    });

    // Calculate revenue by month
    const revenueByMonth: Record<string, number> = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!revenueByMonth[monthYear]) {
        revenueByMonth[monthYear] = 0;
      }
      revenueByMonth[monthYear] += transaction.amount;
    });

    return {
      totalRevenue,
      revenueByPlan,
      revenueByMonth,
      transactionCount: transactions.length,
    };
  }
}
