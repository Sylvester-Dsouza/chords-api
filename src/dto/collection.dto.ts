import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsUUID } from 'class-validator';
import { SongResponseDto } from './song.dto';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Top Worship Songs 2023', description: 'Collection name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'A collection of the most popular worship songs of 2023', description: 'Collection description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/collection.jpg', description: 'URL to collection image', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'Top Worship Songs 2023 - Best Christian Music Collection', description: 'Custom meta title for SEO', required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ example: 'Discover the best worship songs of 2023 in this curated collection featuring top Christian artists and powerful worship anthems.', description: 'Custom meta description for SEO', required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiProperty({ example: true, description: 'Whether the collection is public', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ example: true, description: 'Whether the collection is active', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCollectionDto {
  @ApiProperty({ example: 'Top Worship Songs 2023', description: 'Collection name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'A collection of the most popular worship songs of 2023', description: 'Collection description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/collection.jpg', description: 'URL to collection image', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'Top Worship Songs 2023 - Best Christian Music Collection', description: 'Custom meta title for SEO', required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ example: 'Discover the best worship songs of 2023 in this curated collection featuring top Christian artists and powerful worship anthems.', description: 'Custom meta description for SEO', required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiProperty({ example: true, description: 'Whether the collection is public', required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ example: true, description: 'Whether the collection is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddSongToCollectionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId: string = '';
}

export class CollectionResponseDto {
  @ApiProperty({ description: 'Collection ID' })
  id: string = '';

  @ApiProperty({ example: 'Top Worship Songs 2023', description: 'Collection name' })
  name: string = '';

  @ApiProperty({ example: 'A collection of the most popular worship songs of 2023', description: 'Collection description' })
  description?: string | null = null;

  @ApiProperty({ example: 'https://example.com/collection.jpg', description: 'URL to collection image' })
  imageUrl?: string | null = null;

  @ApiProperty({ example: 'Top Worship Songs 2023 - Best Christian Music Collection', description: 'Custom meta title for SEO' })
  metaTitle?: string | null = null;

  @ApiProperty({ example: 'Discover the best worship songs of 2023 in this curated collection featuring top Christian artists and powerful worship anthems.', description: 'Custom meta description for SEO' })
  metaDescription?: string | null = null;

  @ApiProperty({ example: true, description: 'Whether the collection is public' })
  isPublic: boolean = true;

  @ApiProperty({ example: true, description: 'Whether the collection is active' })
  isActive: boolean = true;

  @ApiProperty({ description: 'Songs in the collection', type: [SongResponseDto] })
  songs?: SongResponseDto[] = [];

  @ApiProperty({ example: 42, description: 'Number of likes for this collection' })
  likeCount: number = 0;

  @ApiProperty({ example: 100, description: 'Number of views for this collection' })
  viewCount: number = 0;

  @ApiProperty({ example: 67, description: 'Number of unique viewers for this collection' })
  uniqueViewers: number = 0;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last time this collection was viewed', required: false })
  lastViewed?: Date | null = null;

  @ApiProperty({ example: true, description: 'Whether the current user has liked this collection', required: false })
  isLiked?: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}
