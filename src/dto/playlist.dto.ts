import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { SongResponseDto } from './song.dto';

export class CreatePlaylistDto {
  @ApiProperty({ example: 'My Worship Playlist', description: 'Playlist name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'A collection of my favorite worship songs', description: 'Playlist description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePlaylistDto {
  @ApiProperty({ example: 'My Worship Playlist', description: 'Playlist name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'A collection of my favorite worship songs', description: 'Playlist description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddSongToPlaylistDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId: string = '';
}

export class PlaylistResponseDto {
  @ApiProperty({ description: 'Playlist ID' })
  id: string = '';

  @ApiProperty({ example: 'My Worship Playlist', description: 'Playlist name' })
  name: string = '';

  @ApiProperty({ example: 'A collection of my favorite worship songs', description: 'Playlist description' })
  description?: string | null = null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ description: 'Songs in the playlist', type: [SongResponseDto] })
  songs?: SongResponseDto[] = [];

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}
