import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsDate, IsUUID } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  @IsUUID()
  customerId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Subscription plan ID' })
  @IsUUID()
  planId: string = '';

  @ApiProperty({ example: '2023-01-15T00:00:00Z', description: 'Start date of the subscription' })
  @IsDate()
  @Type(() => Date)
  startDate: Date = new Date();

  @ApiProperty({ example: '2024-01-15T00:00:00Z', description: 'Renewal date of the subscription' })
  @IsDate()
  @Type(() => Date)
  renewalDate: Date = new Date();

  @ApiProperty({
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
    description: 'Status of the subscription',
    required: false
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiProperty({ example: 'Visa ending in 4242', description: 'Payment method description', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'pm_123456789', description: 'Payment method ID from payment processor', required: false })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ example: true, description: 'Whether the subscription auto-renews', required: false })
  @IsBoolean()
  @IsOptional()
  isAutoRenew?: boolean = true;
}

export class UpdateSubscriptionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Subscription plan ID', required: false })
  @IsUUID()
  @IsOptional()
  planId?: string;

  @ApiProperty({ example: '2024-01-15T00:00:00Z', description: 'Renewal date of the subscription', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  renewalDate?: Date;

  @ApiProperty({
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
    description: 'Status of the subscription',
    required: false
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiProperty({ example: 'Visa ending in 4242', description: 'Payment method description', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'pm_123456789', description: 'Payment method ID from payment processor', required: false })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ example: true, description: 'Whether the subscription auto-renews', required: false })
  @IsBoolean()
  @IsOptional()
  isAutoRenew?: boolean;
}

export class CancelSubscriptionDto {
  @ApiProperty({ example: 'Switching to a different plan', description: 'Reason for cancellation', required: false })
  @IsString()
  @IsOptional()
  cancelReason?: string;

  @ApiProperty({ example: '2023-02-15T00:00:00Z', description: 'Date when the subscription should end', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Unique identifier of the subscription' })
  id: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Subscription plan ID' })
  planId: string = '';

  @ApiProperty({ example: '2023-01-15T00:00:00Z', description: 'Start date of the subscription' })
  startDate: Date = new Date();

  @ApiProperty({ example: '2024-01-15T00:00:00Z', description: 'Renewal date of the subscription' })
  renewalDate: Date = new Date();

  @ApiProperty({ example: '2024-01-15T00:00:00Z', description: 'End date of the subscription (if applicable)' })
  endDate?: Date;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE, description: 'Status of the subscription' })
  status: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @ApiProperty({ example: 'Visa ending in 4242', description: 'Payment method description' })
  paymentMethod?: string;

  @ApiProperty({ example: 'pm_123456789', description: 'Payment method ID from payment processor' })
  paymentMethodId?: string;

  @ApiProperty({ example: '2023-02-15T00:00:00Z', description: 'Date when the subscription was canceled' })
  canceledAt?: Date;

  @ApiProperty({ example: 'Switching to a different plan', description: 'Reason for cancellation' })
  cancelReason?: string;

  @ApiProperty({ example: true, description: 'Whether the subscription auto-renews' })
  isAutoRenew: boolean = true;

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
    billingCycle: string;
  };
}
