import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum FeatureRequestStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum FeatureRequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum FeatureRequestCategory {
  UI_UX = 'UI_UX',
  PERFORMANCE = 'PERFORMANCE',
  NEW_FEATURE = 'NEW_FEATURE',
  BUG_FIX = 'BUG_FIX',
  INTEGRATION = 'INTEGRATION',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
}

export class CreateFeatureRequestDto {
  @ApiProperty({ description: 'Title of the feature request' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Detailed description of the feature request' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ 
    description: 'Category of the feature request',
    enum: FeatureRequestCategory
  })
  @IsOptional()
  @IsEnum(FeatureRequestCategory)
  category?: FeatureRequestCategory;
}

export class UpdateFeatureRequestDto {
  @ApiPropertyOptional({ description: 'Title of the feature request' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the feature request' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Category of the feature request',
    enum: FeatureRequestCategory
  })
  @IsOptional()
  @IsEnum(FeatureRequestCategory)
  category?: FeatureRequestCategory;

  @ApiPropertyOptional({
    description: 'Priority of the feature request',
    enum: FeatureRequestPriority,
    default: FeatureRequestPriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(FeatureRequestPriority)
  priority?: FeatureRequestPriority;

  @ApiPropertyOptional({
    description: 'Status of the feature request',
    enum: FeatureRequestStatus,
    default: FeatureRequestStatus.PENDING
  })
  @IsOptional()
  @IsEnum(FeatureRequestStatus)
  status?: FeatureRequestStatus;
}

export class FeatureRequestResponseDto {
  @ApiProperty({ description: 'Unique identifier for the feature request' })
  id!: string;

  @ApiProperty({ description: 'Title of the feature request' })
  title!: string;

  @ApiProperty({ description: 'Detailed description of the feature request' })
  description!: string;

  @ApiPropertyOptional({ 
    description: 'Category of the feature request',
    enum: FeatureRequestCategory
  })
  category?: FeatureRequestCategory;

  @ApiProperty({
    description: 'Priority of the feature request',
    enum: FeatureRequestPriority,
    default: FeatureRequestPriority.MEDIUM
  })
  priority!: FeatureRequestPriority;

  @ApiProperty({
    description: 'Status of the feature request',
    enum: FeatureRequestStatus,
    default: FeatureRequestStatus.PENDING
  })
  status!: FeatureRequestStatus;

  @ApiProperty({ description: 'Number of upvotes for this request' })
  upvotes!: number;

  @ApiProperty({ description: 'ID of the customer who made the request' })
  customerId!: string;

  @ApiPropertyOptional({ description: 'Customer who made the request' })
  customer?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ description: 'Date and time when the request was created' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date and time when the request was last updated' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Whether the current user has upvoted this request' })
  hasUpvoted?: boolean;
}

export class UpvoteFeatureRequestResponseDto {
  @ApiProperty({ description: 'Unique identifier for the upvote' })
  id!: string;

  @ApiProperty({ description: 'ID of the feature request' })
  featureRequestId!: string;

  @ApiProperty({ description: 'ID of the customer who upvoted' })
  customerId!: string;

  @ApiProperty({ description: 'Date and time when the upvote was created' })
  createdAt!: Date;
}
