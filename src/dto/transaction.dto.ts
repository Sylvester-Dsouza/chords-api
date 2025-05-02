import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsUUID, Min } from 'class-validator';
import { TransactionStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Subscription ID' })
  @IsUUID()
  subscriptionId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  @IsUUID()
  customerId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Plan ID' })
  @IsUUID()
  planId: string = '';

  @ApiProperty({ example: 9.99, description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number = 0;

  @ApiProperty({ example: 'USD', description: 'Currency code', required: false })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
    description: 'Status of the transaction',
    required: false
  })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus = TransactionStatus.COMPLETED;

  @ApiProperty({ example: 'Visa ending in 4242', description: 'Payment method description', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'pi_123456789', description: 'Payment intent ID from payment processor', required: false })
  @IsString()
  @IsOptional()
  paymentIntentId?: string;

  @ApiProperty({ example: '2023-01-15T00:00:00Z', description: 'Transaction date', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  transactionDate?: Date;
}

export class UpdateTransactionDto {
  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
    description: 'Status of the transaction',
    required: false
  })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ example: 'Payment failed due to insufficient funds', description: 'Reason for failure', required: false })
  @IsString()
  @IsOptional()
  failureReason?: string;

  @ApiProperty({ example: 'pi_123456789', description: 'Payment intent ID from payment processor', required: false })
  @IsString()
  @IsOptional()
  paymentIntentId?: string;
}

export class TransactionResponseDto {
  @ApiProperty({ description: 'Unique identifier of the transaction' })
  id: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Subscription ID' })
  subscriptionId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Plan ID' })
  planId: string = '';

  @ApiProperty({ example: 9.99, description: 'Transaction amount' })
  amount: number = 0;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency: string = 'USD';

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.COMPLETED, description: 'Status of the transaction' })
  status: TransactionStatus = TransactionStatus.PENDING;

  @ApiProperty({ example: 'Visa ending in 4242', description: 'Payment method description', nullable: true })
  paymentMethod: string | null = null;

  @ApiProperty({ example: 'pi_123456789', description: 'Payment intent ID from payment processor', nullable: true })
  paymentIntentId: string | null = null;

  @ApiProperty({ example: 'Payment failed due to insufficient funds', description: 'Reason for failure', nullable: true })
  failureReason: string | null = null;

  @ApiProperty({ example: '2023-01-15T00:00:00Z', description: 'Transaction date' })
  transactionDate: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();

  // Include related data
  @ApiProperty({ description: 'Customer information', required: false })
  customer?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ description: 'Plan information', required: false })
  plan?: {
    id: string;
    name: string;
    price: number;
  };
}
