import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class FirebaseAuthDto {
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  @IsNotEmpty()
  firebaseToken: string = '';

  @ApiProperty({ description: 'Firebase ID token (alternative field name)' })
  @IsString()
  @IsOptional()
  idToken?: string;

  @ApiProperty({ description: 'Authentication provider (EMAIL, GOOGLE, FACEBOOK, APPLE)' })
  @IsString()
  @IsNotEmpty()
  authProvider: string = 'EMAIL';

  @ApiProperty({ description: 'User name (optional)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Remember me flag' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean = false;
}
