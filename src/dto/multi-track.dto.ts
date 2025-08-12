import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsBoolean, IsUUID, IsEnum, IsNumber, Max, ValidateNested, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Enum for track types
export enum TrackType {
  VOCALS = 'VOCALS',
  BASS = 'BASS',
  DRUMS = 'DRUMS',
  OTHER = 'OTHER'
}

export class MultiTrackUploadDto {
  @ApiProperty({ example: 'https://storage.supabase.co/vocals.mp3', description: 'URL to vocals track file', required: false })
  @IsString()
  @IsOptional()
  vocalsUrl?: string;

  @ApiProperty({ example: 'https://storage.supabase.co/bass.mp3', description: 'URL to bass track file', required: false })
  @IsString()
  @IsOptional()
  bassUrl?: string;

  @ApiProperty({ example: 'https://storage.supabase.co/drums.mp3', description: 'URL to drums track file', required: false })
  @IsString()
  @IsOptional()
  drumsUrl?: string;

  @ApiProperty({ example: 'https://storage.supabase.co/other.mp3', description: 'URL to other instruments track file', required: false })
  @IsString()
  @IsOptional()
  otherUrl?: string;
}

export class MultiTrackResponseDto {
  @ApiProperty({ description: 'Multi-Track ID' })
  id: string = '';

  @ApiProperty({ description: 'Song ID' })
  songId: string = '';

  @ApiProperty({ example: 'https://storage.supabase.co/vocals.mp3', description: 'URL to vocals track file' })
  vocalsUrl?: string | null = null;

  @ApiProperty({ example: 'https://storage.supabase.co/bass.mp3', description: 'URL to bass track file' })
  bassUrl?: string | null = null;

  @ApiProperty({ example: 'https://storage.supabase.co/drums.mp3', description: 'URL to drums track file' })
  drumsUrl?: string | null = null;

  @ApiProperty({ example: 'https://storage.supabase.co/other.mp3', description: 'URL to other instruments track file' })
  otherUrl?: string | null = null;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'When multi-track was uploaded' })
  uploadedAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'When multi-track was last updated' })
  updatedAt: Date = new Date();
}

export class MultiTrackSongResponseDto {
  @ApiProperty({ description: 'Song ID' })
  id: string = '';

  @ApiProperty({ example: 'Amazing Grace', description: 'Song title' })
  title: string = '';

  @ApiProperty({ example: 'Chris Tomlin', description: 'Artist name' })
  artistName: string = '';

  @ApiProperty({ example: 'https://storage.supabase.co/...', description: 'Song image URL' })
  imageUrl?: string | null = null;

  @ApiProperty({ example: 'G', description: 'Song key' })
  songKey?: string | null = null;

  @ApiProperty({ example: 120, description: 'Song tempo (BPM)' })
  tempo?: number | null = null;

  @ApiProperty({ example: 'Beginner', description: 'Song difficulty level' })
  difficulty?: string | null = null;

  @ApiProperty({ example: 1250, description: 'Total view count' })
  viewCount: number = 0;

  @ApiProperty({ example: 4.5, description: 'Average rating (1-5 stars)' })
  averageRating: number = 0;

  @ApiProperty({ example: 25, description: 'Number of ratings' })
  ratingCount: number = 0;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'When song was created' })
  createdAt: Date = new Date();

  @ApiProperty({ description: 'Multi-track information', type: MultiTrackResponseDto })
  multiTrack: MultiTrackResponseDto = new MultiTrackResponseDto();
}

export class MultiTrackListQueryDto {
  @ApiProperty({ example: 'Amazing Grace', description: 'Search term for song title or artist', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ example: 'G', description: 'Filter by song key', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ example: 'Beginner', description: 'Filter by difficulty level', required: false })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiProperty({ example: 'artist-123', description: 'Filter by artist ID', required: false })
  @IsUUID()
  @IsOptional()
  artistId?: string;

  @ApiProperty({ example: 'popular', description: 'Sort order', enum: ['popular', 'recent', 'title', 'artist'], required: false })
  @IsString()
  @IsOptional()
  sort?: 'popular' | 'recent' | 'title' | 'artist';

  @ApiProperty({ example: 1, description: 'Page number (1-based)', required: false })
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Number of items per page (max 100)', required: false })
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class MultiTrackUpdateDto {
  @ApiProperty({ example: 'https://storage.supabase.co/vocals.mp3', description: 'URL to vocals track file', required: false })
  @IsString()
  @IsOptional()
  vocalsUrl?: string;

  @ApiProperty({ example: 'https://storage.supabase.co/bass.mp3', description: 'URL to bass track file', required: false })
  @IsString()
  @IsOptional()
  bassUrl?: string;

  @ApiProperty({ example: 'https://storage.supabase.co/drums.mp3', description: 'URL to drums track file', required: false })
  @IsString()
  @IsOptional()
  drumsUrl?: string;

  @ApiProperty({ example: 'https://storage.supabase.co/other.mp3', description: 'URL to other instruments track file', required: false })
  @IsString()
  @IsOptional()
  otherUrl?: string;
}

export class MultiTrackAnalyticsDto {
  @ApiProperty({ example: 'song-123', description: 'Song ID' })
  @IsUUID()
  songId: string = '';

  @ApiProperty({ example: 'download', description: 'Analytics action', enum: ['download', 'play', 'view'] })
  @IsString()
  action: string = '';

  @ApiProperty({ example: 180, description: 'Duration in seconds (for play action)', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;
}

export class MultiTrackStatsResponseDto {
  @ApiProperty({ example: 150, description: 'Total number of multi-track songs' })
  totalMultiTrackSongs: number = 0;

  @ApiProperty({ description: 'Most popular multi-track songs', type: [MultiTrackSongResponseDto] })
  popularSongs: MultiTrackSongResponseDto[] = [];

  @ApiProperty({ description: 'Recently added multi-track songs', type: [MultiTrackSongResponseDto] })
  recentSongs: MultiTrackSongResponseDto[] = [];
}

// Simple download response DTO
export class MultiTrackDownloadDto {
  @ApiProperty({ example: 'https://storage.supabase.co/vocals.mp3', description: 'URL to vocals track file' })
  vocalsUrl?: string | null = null;

  @ApiProperty({ example: 'https://storage.supabase.co/bass.mp3', description: 'URL to bass track file' })
  bassUrl?: string | null = null;

  @ApiProperty({ example: 'https://storage.supabase.co/drums.mp3', description: 'URL to drums track file' })
  drumsUrl?: string | null = null;

  @ApiProperty({ example: 'https://storage.supabase.co/other.mp3', description: 'URL to other instruments track file' })
  otherUrl?: string | null = null;
}
