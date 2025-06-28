import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CommunitySetlistCreatorDto {
  @ApiProperty({ description: 'Creator ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Creator name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Creator profile picture URL', required: false })
  @IsOptional()
  @IsString()
  profilePicture?: string;
}

export class CommunitySetlistSongDto {
  @ApiProperty({ description: 'Song ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Song title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Song artist' })
  @IsString()
  artist!: string;

  @ApiProperty({ description: 'Song key', required: false })
  @IsOptional()
  @IsString()
  key?: string;
}

export class CommunitySetlistDto {
  @ApiProperty({ description: 'Setlist ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Setlist name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Setlist description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Creator information', type: CommunitySetlistCreatorDto })
  creator!: CommunitySetlistCreatorDto;

  @ApiProperty({ description: 'Number of songs in setlist' })
  @IsNumber()
  songCount!: number;

  @ApiProperty({ description: 'Number of views' })
  @IsNumber()
  viewCount!: number;

  @ApiProperty({ description: 'Number of likes' })
  @IsNumber()
  likeCount!: number;

  @ApiProperty({ description: 'Whether current user has liked this setlist' })
  @IsBoolean()
  isLikedByUser!: boolean;

  @ApiProperty({ description: 'When setlist was shared publicly' })
  @IsDateString()
  sharedAt!: string;

  @ApiProperty({ description: 'When setlist was created' })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ description: 'When setlist was last updated' })
  @IsDateString()
  updatedAt!: string;

  @ApiProperty({ description: 'Preview of songs in setlist (first 3)', type: [CommunitySetlistSongDto] })
  @IsArray()
  songPreview!: CommunitySetlistSongDto[];
}

export class CommunitySetlistsResponseDto {
  @ApiProperty({ description: 'List of community setlists', type: [CommunitySetlistDto] })
  @IsArray()
  setlists!: CommunitySetlistDto[];

  @ApiProperty({ description: 'Total number of setlists' })
  @IsNumber()
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  @IsNumber()
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  @IsNumber()
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  @IsNumber()
  totalPages!: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  @IsBoolean()
  hasMore!: boolean;
}
