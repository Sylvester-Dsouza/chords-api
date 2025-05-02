import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';

export enum SongRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export class CreateSongRequestDto {
  @ApiProperty({ description: 'Name of the song being requested' })
  @IsString()
  songName!: string;

  @ApiPropertyOptional({ description: 'Name of the artist (optional)' })
  @IsOptional()
  @IsString()
  artistName?: string;

  @ApiPropertyOptional({ description: 'YouTube link to the song (optional)' })
  @IsOptional()
  @IsUrl()
  youtubeLink?: string;

  @ApiPropertyOptional({ description: 'Spotify link to the song (optional)' })
  @IsOptional()
  @IsUrl()
  spotifyLink?: string;

  @ApiPropertyOptional({ description: 'Additional notes or comments about the request' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSongRequestDto {
  @ApiPropertyOptional({ description: 'Name of the song being requested' })
  @IsOptional()
  @IsString()
  songName?: string;

  @ApiPropertyOptional({ description: 'Name of the artist (optional)' })
  @IsOptional()
  @IsString()
  artistName?: string;

  @ApiPropertyOptional({ description: 'YouTube link to the song (optional)' })
  @IsOptional()
  @IsUrl()
  youtubeLink?: string;

  @ApiPropertyOptional({ description: 'Spotify link to the song (optional)' })
  @IsOptional()
  @IsUrl()
  spotifyLink?: string;

  @ApiPropertyOptional({ description: 'Additional notes or comments about the request' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Status of the song request',
    enum: SongRequestStatus,
    default: SongRequestStatus.PENDING
  })
  @IsOptional()
  @IsEnum(SongRequestStatus)
  status?: SongRequestStatus;
}

export class SongRequestResponseDto {
  @ApiProperty({ description: 'Unique identifier for the song request' })
  id!: string;

  @ApiProperty({ description: 'Name of the song being requested' })
  songName!: string;

  @ApiPropertyOptional({ description: 'Name of the artist (optional)' })
  artistName?: string;

  @ApiPropertyOptional({ description: 'YouTube link to the song (optional)' })
  youtubeLink?: string;

  @ApiPropertyOptional({ description: 'Spotify link to the song (optional)' })
  spotifyLink?: string;

  @ApiPropertyOptional({ description: 'Additional notes or comments about the request' })
  notes?: string;

  @ApiProperty({
    description: 'Status of the song request',
    enum: SongRequestStatus,
    default: SongRequestStatus.PENDING
  })
  status!: SongRequestStatus;

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

export class UpvoteSongRequestResponseDto {
  @ApiProperty({ description: 'Unique identifier for the upvote' })
  id!: string;

  @ApiProperty({ description: 'ID of the song request' })
  songRequestId!: string;

  @ApiProperty({ description: 'ID of the customer who upvoted' })
  customerId!: string;

  @ApiProperty({ description: 'Date and time when the upvote was created' })
  createdAt!: Date;
}
