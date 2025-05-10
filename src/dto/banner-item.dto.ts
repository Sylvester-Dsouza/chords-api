import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum LinkType {
  SONG = 'song',
  ARTIST = 'artist',
  COLLECTION = 'collection',
  EXTERNAL = 'external',
  NONE = 'none'
}

export class CreateBannerItemDto {
  @ApiProperty({ description: 'Title of the banner item', example: 'New Christmas Collection' })
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiPropertyOptional({ description: 'Description of the banner item', example: 'Check out our new Christmas songs!' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Image URL from Supabase Storage', example: 'https://supabase.storage.url/banners/christmas.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Type of link',
    enum: LinkType,
    example: LinkType.COLLECTION,
    default: LinkType.NONE
  })
  @IsEnum(LinkType)
  @IsOptional()
  linkType?: LinkType;

  @ApiPropertyOptional({
    description: 'ID of the linked item (required when linkType is not EXTERNAL or NONE)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID('4')
  @IsOptional()
  linkId?: string;

  @ApiPropertyOptional({
    description: 'URL for external links (required when linkType is EXTERNAL)',
    example: 'https://example.com'
  })
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({
    description: 'Display order in the banner (lower numbers appear first)',
    example: 0,
    default: 0
  })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether this banner item is active and should be displayed',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBannerItemDto {
  @ApiPropertyOptional({ description: 'Title of the banner item', example: 'New Christmas Collection' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the banner item', example: 'Check out our new Christmas songs!' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Image URL from Supabase Storage', example: 'https://supabase.storage.url/banners/christmas.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Type of link',
    enum: LinkType,
    example: LinkType.COLLECTION
  })
  @IsEnum(LinkType)
  @IsOptional()
  linkType?: LinkType;

  @ApiPropertyOptional({
    description: 'ID of the linked item (required when linkType is not EXTERNAL or NONE)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID('4')
  @IsOptional()
  linkId?: string;

  @ApiPropertyOptional({
    description: 'URL for external links (required when linkType is EXTERNAL)',
    example: 'https://example.com'
  })
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({
    description: 'Display order in the banner (lower numbers appear first)',
    example: 0
  })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether this banner item is active and should be displayed',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BannerItemDto {
  @ApiProperty({ description: 'Unique identifier', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string = '';

  @ApiProperty({ description: 'Home section ID this banner item belongs to', example: '123e4567-e89b-12d3-a456-426614174000' })
  homeSectionId: string = '';

  @ApiProperty({ description: 'Title of the banner item', example: 'New Christmas Collection' })
  title: string = '';

  @ApiProperty({ description: 'Description of the banner item', example: 'Check out our new Christmas songs!' })
  description?: string | null = null;

  @ApiProperty({ description: 'Image URL from Supabase Storage', example: 'https://supabase.storage.url/banners/christmas.jpg' })
  imageUrl: string = '';

  @ApiProperty({
    description: 'Type of link',
    enum: LinkType,
    example: LinkType.COLLECTION
  })
  linkType: string | null = null;

  @ApiProperty({
    description: 'ID of the linked item',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  linkId?: string | null = null;

  @ApiProperty({
    description: 'URL for external links',
    example: 'https://example.com'
  })
  externalUrl?: string | null = null;

  @ApiProperty({
    description: 'Display order in the banner (lower numbers appear first)',
    example: 0
  })
  order: number = 0;

  @ApiProperty({
    description: 'Whether this banner item is active and should be displayed',
    example: true
  })
  isActive: boolean = true;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date = new Date();

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date = new Date();
}

export class ReorderBannerItemsDto {
  @ApiProperty({
    description: 'Array of banner item IDs in the desired order',
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  bannerItemIds: string[] = [];
}
