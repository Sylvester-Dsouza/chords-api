import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

import { SubscriptionType, AuthProvider } from '@prisma/client';

export enum SubscriptionTypeEnum {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  PRO = 'PRO',
}

export enum AuthProviderEnum {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer ID' })
  id: string = '';

  @ApiProperty({ example: 'John Doe', description: 'Customer full name' })
  name: string = '';

  @ApiProperty({ example: 'john@example.com', description: 'Customer email address' })
  email: string = '';

  @ApiProperty({ example: 'firebase123', description: 'Firebase UID', required: false })
  firebaseUid: string | null = null;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'Profile picture URL', required: false })
  profilePicture: string | null = null;

  @ApiProperty({ example: '+1234567890', description: 'Phone number', required: false })
  phoneNumber: string | null = null;

  @ApiProperty({ enum: SubscriptionType, default: SubscriptionType.FREE, description: 'Subscription type' })
  subscriptionType: SubscriptionType = SubscriptionType.FREE;

  @ApiProperty({ example: true, description: 'Whether to show ads to this customer' })
  showAds: boolean = true;

  @ApiProperty({ example: true, description: 'Whether the account is active' })
  isActive: boolean = true;

  @ApiProperty({ example: false, description: 'Whether the email is verified' })
  isEmailVerified: boolean = false;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last login date', required: false })
  lastLoginAt: Date | null = null;

  @ApiProperty({ enum: AuthProvider, default: AuthProvider.EMAIL, description: 'Authentication provider' })
  authProvider: AuthProvider = AuthProvider.EMAIL;

  @ApiProperty({ example: false, description: 'Whether to remember the user' })
  rememberMe: boolean = false;

  @ApiProperty({ example: true, description: 'Whether terms and conditions are accepted' })
  termsAccepted: boolean = false;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Terms acceptance date', required: false })
  termsAcceptedAt: Date | null = null;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Account creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Account last update date' })
  updatedAt: Date = new Date();
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'John Doe', description: 'Customer full name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'john@example.com', description: 'Customer email address' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'firebase123', description: 'Firebase UID', required: false })
  @IsString()
  @IsOptional()
  firebaseUid?: string;

  @ApiProperty({ enum: SubscriptionType, default: SubscriptionType.FREE, description: 'Subscription type' })
  @IsEnum(SubscriptionType)
  @IsOptional()
  subscriptionType?: SubscriptionType = SubscriptionType.FREE;

  @ApiProperty({ example: true, description: 'Whether to show ads to this customer', required: false })
  @IsBoolean()
  @IsOptional()
  showAds?: boolean = true;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'Profile picture URL' })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ enum: AuthProvider, default: AuthProvider.EMAIL, description: 'Authentication provider' })
  @IsEnum(AuthProvider)
  @IsOptional()
  authProvider?: AuthProvider = AuthProvider.EMAIL;

  @ApiProperty({ example: true, description: 'Whether terms and conditions are accepted' })
  @IsBoolean()
  @IsOptional()
  termsAccepted?: boolean = false;
}

export class UpdateCustomerDto {
  @ApiProperty({ example: 'John Doe', description: 'Customer full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'firebase123', description: 'Firebase UID' })
  @IsString()
  @IsOptional()
  firebaseUid?: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'Profile picture URL' })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ enum: SubscriptionType, description: 'Subscription type' })
  @IsEnum(SubscriptionType)
  @IsOptional()
  subscriptionType?: SubscriptionType;

  @ApiProperty({ example: true, description: 'Whether to show ads to this customer' })
  @IsBoolean()
  @IsOptional()
  showAds?: boolean;

  @ApiProperty({ example: true, description: 'Whether the account is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, description: 'Whether the email is verified' })
  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @ApiProperty({ enum: AuthProvider, description: 'Authentication provider' })
  @IsEnum(AuthProvider)
  @IsOptional()
  authProvider?: AuthProvider;

  @ApiProperty({ example: false, description: 'Whether to remember the user' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;

  @ApiProperty({ example: true, description: 'Whether terms and conditions are accepted' })
  @IsBoolean()
  @IsOptional()
  termsAccepted?: boolean;
}

// Firebase handles password changes, but we keep this DTO for API compatibility
export class ChangePasswordDto {
  @ApiProperty({ example: 'currentpassword', description: 'Current password' })
  @IsString()
  currentPassword: string = '';

  @ApiProperty({ example: 'newpassword123', description: 'New password' })
  @IsString()
  newPassword: string = '';
}
