import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionService } from '../../services/transaction.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionResponseDto } from '../../dto/transaction.dto';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

class DateRangeDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'The transaction has been successfully created.', type: TransactionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription, customer, or plan not found.' })
  create(@Body() createTransactionDto: CreateTransactionDto): Promise<TransactionResponseDto> {
    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by transaction status' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'planId', required: false, description: 'Filter by plan ID' })
  @ApiQuery({ name: 'startDate', required: false, type: Date, description: 'Start date for filtering transactions' })
  @ApiQuery({ name: 'endDate', required: false, type: Date, description: 'End date for filtering transactions' })
  @ApiResponse({ status: 200, description: 'Return all transactions.', type: [TransactionResponseDto] })
  findAll(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('planId') planId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionService.findAll(status, customerId, planId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Return the transaction.', type: TransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  findOne(@Param('id') id: string): Promise<TransactionResponseDto> {
    return this.transactionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'The transaction has been successfully updated.', type: TransactionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto): Promise<TransactionResponseDto> {
    return this.transactionService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'The transaction has been successfully deleted.', type: TransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  remove(@Param('id') id: string): Promise<TransactionResponseDto> {
    return this.transactionService.remove(id);
  }

  @Get('subscription/:subscriptionId')
  @ApiOperation({ summary: 'Get all transactions for a subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Return all transactions for the subscription.', type: [TransactionResponseDto] })
  getSubscriptionTransactions(@Param('subscriptionId') subscriptionId: string): Promise<TransactionResponseDto[]> {
    return this.transactionService.getSubscriptionTransactions(subscriptionId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get all transactions for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return all transactions for the customer.', type: [TransactionResponseDto] })
  getCustomerTransactions(@Param('customerId') customerId: string): Promise<TransactionResponseDto[]> {
    return this.transactionService.getCustomerTransactions(customerId);
  }

  @Get('stats/revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date, description: 'Start date for filtering transactions' })
  @ApiQuery({ name: 'endDate', required: false, type: Date, description: 'End date for filtering transactions' })
  @ApiResponse({ status: 200, description: 'Return revenue statistics.' })
  getRevenueStats(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ): Promise<any> {
    return this.transactionService.getRevenueStats(startDate, endDate);
  }
}
