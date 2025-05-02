import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
  EDITOR = 'EDITOR',
}

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'firebase123', description: 'Firebase UID', required: false })
  @IsString()
  @IsOptional()
  firebaseUid?: string;

  @ApiProperty({ enum: UserRole, description: 'User role', default: UserRole.EDITOR })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.EDITOR;

  @ApiProperty({ example: true, description: 'Whether the user is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'firebase123', description: 'Firebase UID' })
  @IsString()
  @IsOptional()
  firebaseUid?: string;

  @ApiProperty({ enum: UserRole, description: 'User role' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: true, description: 'Whether the user is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last login date' })
  @IsOptional()
  lastLoginAt?: Date;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string = '';

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  name: string = '';

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  email: string = '';

  @ApiProperty({ enum: UserRole, description: 'User role' })
  role: UserRole = UserRole.EDITOR;

  @ApiProperty({ example: true, description: 'Whether the user is active' })
  isActive: boolean = true;

  @ApiProperty({ example: 'firebase123', description: 'Firebase UID', required: false })
  firebaseUid?: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last login date', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Account creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Account last update date' })
  updatedAt: Date = new Date();
}
