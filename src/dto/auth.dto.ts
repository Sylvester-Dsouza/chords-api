import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export enum AuthProviderEnum {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(6)
  password: string = '';

  @ApiProperty({ example: true, description: 'Whether user accepted terms and conditions' })
  @IsBoolean()
  @IsOptional()
  termsAccepted?: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  password: string = '';

  @ApiProperty({ example: false, description: 'Whether to remember the user' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

export class FirebaseAuthDto {
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  firebaseToken: string = '';

  // Add idToken as an alias for firebaseToken for compatibility
  @ApiProperty({ description: 'Firebase ID token (alternative field name)', required: false })
  @IsString()
  @IsOptional()
  idToken?: string;

  @ApiProperty({ enum: AuthProviderEnum, description: 'Authentication provider' })
  @IsEnum(AuthProviderEnum)
  authProvider: string = AuthProviderEnum.EMAIL;

  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: false, description: 'Whether to remember the user' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string = '';
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string = '';
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email: string = '';
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  token: string = '';

  @ApiProperty({ example: 'newpassword123', description: 'New password' })
  @IsString()
  @MinLength(6)
  password: string = '';
}
