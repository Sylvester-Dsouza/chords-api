import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({ example: 'English', description: 'Language name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: true, description: 'Whether the language is active', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateLanguageDto {
  @ApiProperty({ example: 'English', description: 'Language name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: true, description: 'Whether the language is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class LanguageResponseDto {
  @ApiProperty({ description: 'Language ID' })
  id: string = '';

  @ApiProperty({ example: 'English', description: 'Language name' })
  name: string = '';

  @ApiProperty({ example: true, description: 'Whether the language is active' })
  isActive: boolean = true;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date = new Date();

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date = new Date();
}
