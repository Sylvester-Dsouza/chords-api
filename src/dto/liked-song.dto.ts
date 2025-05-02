import { ApiProperty } from '@nestjs/swagger';
import { SongResponseDto } from './song.dto';

export class LikedSongResponseDto {
  @ApiProperty({ description: 'Liked Song ID' })
  id: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  songId: string = '';

  @ApiProperty({ description: 'Song information', type: SongResponseDto })
  song?: SongResponseDto;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();
}
