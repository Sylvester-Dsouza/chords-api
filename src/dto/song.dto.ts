import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray, Min, Max, IsUUID } from 'class-validator';
import { ArtistResponseDto } from './artist.dto';
import { LanguageResponseDto } from './language.dto';

export class CreateSongDto {
  @ApiProperty({ example: 'Oceans', description: 'Song title' })
  @IsString()
  title: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Artist ID' })
  @IsUUID()
  artistId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Language ID', required: false })
  @IsUUID()
  @IsOptional()
  languageId?: string;

  // Album field removed

  @ApiProperty({ example: 'G', description: 'Song key', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ example: 72, description: 'Song tempo in BPM', required: false })
  @IsInt()
  @Min(1)
  @Max(300)
  @IsOptional()
  tempo?: number;

  @ApiProperty({ example: '4/4', description: 'Time signature', required: false })
  @IsString()
  @IsOptional()
  timeSignature?: string;

  @ApiProperty({ example: 'Beginner', description: 'Difficulty level', required: false })
  @IsString()
  @IsOptional()
  difficulty?: string;

  // Lyrics field removed - lyrics are included in the chord sheet

  @ApiProperty({ example: 'G       C\nYou call me out upon the waters...', description: 'Chord sheet with lyrics and chords' })
  @IsString()
  chordSheet: string = '';

  @ApiProperty({ example: 'https://example.com/song-cover.jpg', description: 'URL to song cover image', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'URL to the official music video', required: false })
  @IsString()
  @IsOptional()
  officialVideoUrl?: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'URL to a tutorial video showing how to play the song', required: false })
  @IsString()
  @IsOptional()
  tutorialVideoUrl?: string;

  @ApiProperty({ example: 0, description: 'Capo position', required: false, default: 0 })
  @IsInt()
  @Min(-10)
  @Max(10)
  @IsOptional()
  capo?: number;

  @ApiProperty({ example: ['worship', 'contemporary'], description: 'Song tags', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 'ACTIVE', description: 'Song status', enum: ['DRAFT', 'ACTIVE'], required: false, default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: 'DRAFT' | 'ACTIVE';

  @ApiProperty({ example: 'Learn to play Amazing Grace - Easy Guitar Chords', description: 'Custom meta title for SEO', required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ example: 'Learn how to play Amazing Grace with easy guitar chords. Perfect for beginners and worship teams.', description: 'Custom meta description for SEO', required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}

export class UpdateSongDto {
  @ApiProperty({ example: 'Oceans', description: 'Song title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Artist ID', required: false })
  @IsUUID()
  @IsOptional()
  artistId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Language ID', required: false })
  @IsUUID()
  @IsOptional()
  languageId?: string;

  // Album field removed

  @ApiProperty({ example: 'G', description: 'Song key', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ example: 72, description: 'Song tempo in BPM', required: false })
  @IsInt()
  @Min(1)
  @Max(300)
  @IsOptional()
  tempo?: number;

  @ApiProperty({ example: '4/4', description: 'Time signature', required: false })
  @IsString()
  @IsOptional()
  timeSignature?: string;

  @ApiProperty({ example: 'Beginner', description: 'Difficulty level', required: false })
  @IsString()
  @IsOptional()
  difficulty?: string;

  // Lyrics field removed - lyrics are included in the chord sheet

  @ApiProperty({ example: 'G       C\nYou call me out upon the waters...', description: 'Chord sheet with lyrics and chords', required: false })
  @IsString()
  @IsOptional()
  chordSheet?: string;

  @ApiProperty({ example: 'https://example.com/song-cover.jpg', description: 'URL to song cover image', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'URL to the official music video', required: false })
  @IsString()
  @IsOptional()
  officialVideoUrl?: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'URL to a tutorial video showing how to play the song', required: false })
  @IsString()
  @IsOptional()
  tutorialVideoUrl?: string;

  @ApiProperty({ example: 0, description: 'Capo position', required: false })
  @IsInt()
  @Min(-10)
  @Max(10)
  @IsOptional()
  capo?: number;

  @ApiProperty({ example: ['worship', 'contemporary'], description: 'Song tags', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 'ACTIVE', description: 'Song status', enum: ['DRAFT', 'ACTIVE'], required: false })
  @IsString()
  @IsOptional()
  status?: 'DRAFT' | 'ACTIVE';

  @ApiProperty({ example: 'Learn to play Amazing Grace - Easy Guitar Chords', description: 'Custom meta title for SEO', required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ example: 'Learn how to play Amazing Grace with easy guitar chords. Perfect for beginners and worship teams.', description: 'Custom meta description for SEO', required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}

export class SongResponseDto {
  @ApiProperty({ description: 'Song ID' })
  id: string = '';

  @ApiProperty({ example: 'Oceans', description: 'Song title' })
  title: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Artist ID' })
  artistId: string = '';

  @ApiProperty({ description: 'Artist information' })
  artist?: ArtistResponseDto;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Language ID' })
  languageId?: string | null = null;

  @ApiProperty({ description: 'Language information' })
  language?: LanguageResponseDto | null;

  // Album field removed

  @ApiProperty({ example: 'G', description: 'Song key' })
  key?: string | null = null;

  @ApiProperty({ example: 72, description: 'Song tempo in BPM' })
  tempo?: number | null = null;

  @ApiProperty({ example: '4/4', description: 'Time signature' })
  timeSignature?: string | null = null;

  @ApiProperty({ example: 'Beginner', description: 'Difficulty level' })
  difficulty?: string | null = null;

  // Lyrics field removed - lyrics are included in the chord sheet

  @ApiProperty({ example: 'G       C\nYou call me out upon the waters...', description: 'Chord sheet with lyrics and chords' })
  chordSheet: string = '';

  @ApiProperty({ example: 'https://example.com/song-cover.jpg', description: 'URL to song cover image' })
  imageUrl?: string | null = null;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'URL to the official music video' })
  officialVideoUrl?: string | null = null;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'URL to a tutorial video showing how to play the song' })
  tutorialVideoUrl?: string | null = null;

  @ApiProperty({ example: 0, description: 'Capo position' })
  capo: number = 0;

  @ApiProperty({ example: ['worship', 'contemporary'], description: 'Song tags' })
  tags: string[] = [];

  @ApiProperty({ example: 'ACTIVE', description: 'Song status', enum: ['DRAFT', 'ACTIVE'] })
  status: 'DRAFT' | 'ACTIVE' = 'ACTIVE';

  @ApiProperty({ example: 1245, description: 'Number of views for this song' })
  viewCount: number = 0;

  @ApiProperty({ example: 87, description: 'Number of unique viewers for this song' })
  uniqueViewers: number = 0;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last time this song was viewed', required: false })
  lastViewed?: Date | null = null;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();

  @ApiProperty({ example: 'Learn to play Amazing Grace - Easy Guitar Chords', description: 'Custom meta title for SEO' })
  metaTitle?: string | null = null;

  @ApiProperty({ example: 'Learn how to play Amazing Grace with easy guitar chords. Perfect for beginners and worship teams.', description: 'Custom meta description for SEO' })
  metaDescription?: string | null = null;
}
