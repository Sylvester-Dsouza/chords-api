import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';
import { SongResponseDto } from './song.dto';

export class CreateSetlistDto {
  @ApiProperty({ example: 'Sunday Morning Worship', description: 'Setlist name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Songs for Sunday morning worship service', description: 'Setlist description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSetlistDto {
  @ApiProperty({ example: 'Sunday Morning Worship', description: 'Setlist name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Songs for Sunday morning worship service', description: 'Setlist description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddSongToSetlistDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId: string = '';
}

export class AddMultipleSongsToSetlistDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001'],
    description: 'Array of Song IDs to add to setlist'
  })
  @IsArray()
  @IsUUID('4', { each: true })
  songIds: string[] = [];
}

export class SetlistResponseDto {
  @ApiProperty({ description: 'Setlist ID' })
  id: string = '';

  @ApiProperty({ example: 'Sunday Morning Worship', description: 'Setlist name' })
  name: string = '';

  @ApiProperty({ example: 'Songs for Sunday morning worship service', description: 'Setlist description' })
  description?: string | null = null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ description: 'Songs in the setlist', type: [SongResponseDto] })
  songs?: SongResponseDto[] = [];

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}
