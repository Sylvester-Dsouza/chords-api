import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateSongRatingDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId!: string;

  @ApiProperty({ example: 5, description: 'Rating value (1-5 stars)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Great song, easy to play!', description: 'Optional comment about the rating', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateSongRatingDto {
  @ApiProperty({ example: 5, description: 'Rating value (1-5 stars)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Great song, easy to play!', description: 'Optional comment about the rating', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class SongRatingResponseDto {
  @ApiProperty({ description: 'Rating ID' })
  id!: string;

  @ApiProperty({ description: 'Song ID' })
  songId!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ example: 5, description: 'Rating value (1-5 stars)', minimum: 1, maximum: 5 })
  rating!: number;

  @ApiProperty({ example: 'Great song, easy to play!', description: 'Optional comment about the rating', required: false, nullable: true })
  comment?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class SongRatingStatsDto {
  @ApiProperty({ example: 4.5, description: 'Average rating value' })
  averageRating!: number;

  @ApiProperty({ example: 42, description: 'Total number of ratings' })
  ratingCount!: number;

  @ApiProperty({ description: 'Distribution of ratings by star value' })
  distribution!: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    [key: string]: number;
  };
}
