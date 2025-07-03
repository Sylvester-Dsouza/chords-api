import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsBoolean, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SongResponseDto } from './song.dto';

export class KaraokeUploadDto {
  @ApiProperty({ example: 'G', description: 'Original key for karaoke track', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ example: 240, description: 'Karaoke duration in seconds', required: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '' || value === 'undefined') {
      return undefined;
    }
    const num = parseInt(value, 10);
    return isNaN(num) || num < 0 ? undefined : num;
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: 'HIGH', description: 'Quality indicator', enum: ['HIGH', 'MEDIUM', 'LOW'], required: false })
  @IsString()
  @IsOptional()
  quality?: string;

  @ApiProperty({ example: 'Professional studio recording', description: 'Admin notes about the karaoke', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class KaraokeResponseDto {
  @ApiProperty({ description: 'Karaoke ID' })
  id: string = '';

  @ApiProperty({ description: 'Song ID' })
  songId: string = '';

  @ApiProperty({ example: 'https://storage.supabase.co/bucket/karaoke/song-123-karaoke.mp3', description: 'URL to karaoke backing track' })
  fileUrl: string = '';

  @ApiProperty({ example: 5242880, description: 'Karaoke file size in bytes' })
  fileSize?: number | null = null;

  @ApiProperty({ example: 240, description: 'Karaoke duration in seconds' })
  duration?: number | null = null;

  @ApiProperty({ example: 'G', description: 'Original key for karaoke track' })
  key?: string | null = null;

  @ApiProperty({ example: 'user-123', description: 'User ID who uploaded the karaoke' })
  uploadedBy?: string | null = null;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'When karaoke was uploaded' })
  uploadedAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'When karaoke was last updated' })
  updatedAt: Date = new Date();

  @ApiProperty({ example: 1, description: 'Version number' })
  version: number = 1;

  @ApiProperty({ example: 'ACTIVE', description: 'Karaoke status', enum: ['ACTIVE', 'INACTIVE', 'PROCESSING'] })
  status: string = 'ACTIVE';

  @ApiProperty({ example: 'HIGH', description: 'Quality indicator', enum: ['HIGH', 'MEDIUM', 'LOW'] })
  quality?: string | null = null;

  @ApiProperty({ example: 'Professional studio recording', description: 'Admin notes about the karaoke' })
  notes?: string | null = null;
}

export class KaraokeSongResponseDto {
  @ApiProperty({ description: 'Song ID' })
  id: string = '';

  @ApiProperty({ example: 'Oceans', description: 'Song title' })
  title: string = '';

  @ApiProperty({ example: 'Hillsong United', description: 'Artist name' })
  artistName: string = '';

  @ApiProperty({ example: 'https://example.com/song-cover.jpg', description: 'URL to song cover image' })
  imageUrl?: string | null = null;

  @ApiProperty({ example: 'G', description: 'Song key' })
  songKey?: string | null = null;

  @ApiProperty({ example: 72, description: 'Song tempo in BPM' })
  tempo?: number | null = null;

  @ApiProperty({ example: 'Beginner', description: 'Difficulty level' })
  difficulty?: string | null = null;

  @ApiProperty({ example: 1245, description: 'Number of views for this song' })
  viewCount: number = 0;

  @ApiProperty({ example: 4.5, description: 'Average rating for this song' })
  averageRating: number = 0;

  @ApiProperty({ example: 87, description: 'Number of ratings for this song' })
  ratingCount: number = 0;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Song creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ description: 'Karaoke track information' })
  karaoke: KaraokeResponseDto = new KaraokeResponseDto();
}

export class KaraokeListQueryDto {
  @ApiProperty({ example: 'amazing grace', description: 'Search term for song title or artist', required: false })
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

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by artist ID', required: false })
  @IsUUID()
  @IsOptional()
  artistId?: string;

  @ApiProperty({ example: 'popular', description: 'Sort order', enum: ['popular', 'recent', 'title', 'artist'], required: false, default: 'popular' })
  @IsString()
  @IsOptional()
  sort?: 'popular' | 'recent' | 'title' | 'artist';

  @ApiProperty({ example: 1, description: 'Page number', required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 20, description: 'Number of items per page', required: false, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class KaraokeUpdateDto {
  @ApiProperty({ example: 'G', description: 'Original key for karaoke track', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ example: 240, description: 'Karaoke duration in seconds', required: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '' || value === 'undefined') {
      return undefined;
    }
    const num = parseInt(value, 10);
    return isNaN(num) || num < 0 ? undefined : num;
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: 'ACTIVE', description: 'Karaoke status', enum: ['ACTIVE', 'INACTIVE', 'PROCESSING'], required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'HIGH', description: 'Quality indicator', enum: ['HIGH', 'MEDIUM', 'LOW'], required: false })
  @IsString()
  @IsOptional()
  quality?: string;

  @ApiProperty({ example: 'Updated notes', description: 'Admin notes about the karaoke', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class KaraokeAnalyticsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId: string = '';

  @ApiProperty({ example: 'download', description: 'Action type', enum: ['download', 'play', 'complete'] })
  @IsString()
  action: 'download' | 'play' | 'complete' = 'play';

  @ApiProperty({ example: 240, description: 'Duration played in seconds (for play action)', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;
}

export class KaraokeStatsResponseDto {
  @ApiProperty({ example: 150, description: 'Total number of karaoke songs available' })
  totalKaraokeSongs: number = 0;

  @ApiProperty({ example: 2500, description: 'Total downloads across all karaoke songs' })
  totalDownloads: number = 0;

  @ApiProperty({ example: 8750, description: 'Total plays across all karaoke songs' })
  totalPlays: number = 0;

  @ApiProperty({ example: 1024000000, description: 'Total storage used by karaoke files in bytes' })
  totalStorageUsed: number = 0;

  @ApiProperty({ description: 'Most popular karaoke songs' })
  popularSongs: KaraokeSongResponseDto[] = [];

  @ApiProperty({ description: 'Recently added karaoke songs' })
  recentSongs: KaraokeSongResponseDto[] = [];
}
