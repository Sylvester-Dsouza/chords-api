import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium Monthly', description: 'Name of the subscription plan' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Get access to all premium features', description: 'Description of the plan', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 9.99, description: 'Price of the subscription plan' })
  @IsNumber()
  @Min(0)
  price: number = 0;

  @ApiProperty({
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Billing cycle of the subscription plan'
  })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle = BillingCycle.MONTHLY;

  @ApiProperty({
    example: ['Ad-free experience', 'Unlimited song access'],
    description: 'Features included in the subscription plan'
  })
  @IsArray()
  @IsString({ each: true })
  features: string[] = [];

  @ApiProperty({ example: true, description: 'Whether the plan is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium Monthly', description: 'Name of the subscription plan', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Get access to all premium features', description: 'Description of the plan', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 9.99, description: 'Price of the subscription plan', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Billing cycle of the subscription plan',
    required: false
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiProperty({
    example: ['Ad-free experience', 'Unlimited song access'],
    description: 'Features included in the subscription plan',
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: true, description: 'Whether the plan is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SubscriptionPlanResponseDto {
  @ApiProperty({ description: 'Unique identifier of the subscription plan' })
  id: string = '';

  @ApiProperty({ example: 'Premium Monthly', description: 'Name of the subscription plan' })
  name: string = '';

  @ApiProperty({ example: 'Get access to all premium features', description: 'Description of the plan' })
  description?: string;

  @ApiProperty({ example: 9.99, description: 'Price of the subscription plan' })
  price: number = 0;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY, description: 'Billing cycle of the subscription plan' })
  billingCycle: BillingCycle = BillingCycle.MONTHLY;

  @ApiProperty({ example: ['Ad-free experience', 'Unlimited song access'], description: 'Features included in the subscription plan' })
  features: string[] = [];

  @ApiProperty({ example: true, description: 'Whether the plan is active' })
  isActive: boolean = true;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();

  // Optional fields for analytics
  @ApiProperty({ example: 342, description: 'Number of subscribers to this plan', required: false })
  subscriberCount?: number;

  @ApiProperty({ example: 3416.58, description: 'Total revenue from this plan', required: false })
  revenue?: number;
}
