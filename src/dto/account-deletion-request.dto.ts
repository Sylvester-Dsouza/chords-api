import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { AccountDeletionStatus } from '@prisma/client';

export class CreateAccountDeletionRequestDto {
  @ApiProperty({
    description: 'Reason for account deletion request',
    example: 'No longer using the service'
  })
  @IsString()
  reason!: string;
}

export class UpdateAccountDeletionRequestDto {
  @ApiPropertyOptional({
    description: 'Status of the account deletion request',
    enum: AccountDeletionStatus,
    example: AccountDeletionStatus.APPROVED
  })
  @IsEnum(AccountDeletionStatus)
  @IsOptional()
  status?: AccountDeletionStatus;

  @ApiPropertyOptional({
    description: 'Notes about the account deletion request',
    example: 'Customer contacted for confirmation'
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'ID of the admin who processed the request',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  processedBy?: string;
}

export class AccountDeletionRequestResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the account deletion request',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the customer who requested account deletion',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  customerId!: string;

  @ApiProperty({
    description: 'Reason for account deletion request',
    example: 'No longer using the service'
  })
  reason!: string;

  @ApiProperty({
    description: 'Status of the account deletion request',
    enum: AccountDeletionStatus,
    example: AccountDeletionStatus.PENDING
  })
  status!: AccountDeletionStatus;

  @ApiProperty({
    description: 'Date when the deletion was requested',
    example: '2023-01-01T00:00:00.000Z'
  })
  requestedAt!: Date;

  @ApiPropertyOptional({
    description: 'Date when the request was processed',
    example: '2023-01-02T00:00:00.000Z'
  })
  processedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of the admin who processed the request',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  processedBy?: string;

  @ApiPropertyOptional({
    description: 'Notes about the account deletion request',
    example: 'Customer contacted for confirmation'
  })
  notes?: string;

  @ApiProperty({
    description: 'Date when the record was created',
    example: '2023-01-01T00:00:00.000Z'
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when the record was last updated',
    example: '2023-01-02T00:00:00.000Z'
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Customer information',
    type: 'object',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john.doe@example.com',
      profilePicture: 'https://example.com/profile.jpg'
    }
  })
  customer?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}