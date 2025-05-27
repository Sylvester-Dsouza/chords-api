import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JsonValue } from '@prisma/client/runtime/library';

class SocialLinks {
  @ApiProperty({ example: 'https://facebook.com/artist', required: false })
  @IsUrl()
  @IsOptional()
  facebook?: string;

  @ApiProperty({ example: 'https://twitter.com/artist', required: false })
  @IsUrl()
  @IsOptional()
  twitter?: string;

  @ApiProperty({ example: 'https://instagram.com/artist', required: false })
  @IsUrl()
  @IsOptional()
  instagram?: string;

  @ApiProperty({ example: 'https://youtube.com/artist', required: false })
  @IsUrl()
  @IsOptional()
  youtube?: string;
}

export class CreateArtistDto {
  @ApiProperty({ example: 'Hillsong United', description: 'Artist name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Hillsong United is a worship band...', description: 'Artist biography', required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ example: 'https://example.com/artist.jpg', description: 'URL to artist image', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'https://hillsong.com', description: 'Artist website', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: true, description: 'Whether the artist is featured', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: true, description: 'Whether the artist is active', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Social media links',
    required: false,
    type: SocialLinks
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinks)
  @IsOptional()
  socialLinks?: SocialLinks;
}

export class UpdateArtistDto {
  @ApiProperty({ example: 'Hillsong United', description: 'Artist name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Hillsong United is a worship band...', description: 'Artist biography', required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ example: 'https://example.com/artist.jpg', description: 'URL to artist image', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'https://hillsong.com', description: 'Artist website', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: true, description: 'Whether the artist is featured', required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: true, description: 'Whether the artist is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Social media links',
    required: false,
    type: SocialLinks
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinks)
  @IsOptional()
  socialLinks?: SocialLinks;
}

export class ArtistResponseDto {
  @ApiProperty({ description: 'Artist ID' })
  id: string = '';

  @ApiProperty({ example: 'Hillsong United', description: 'Artist name' })
  name: string = '';

  @ApiProperty({ example: 'Hillsong United is a worship band...', description: 'Artist biography' })
  bio?: string | null = null;

  @ApiProperty({ example: 'https://example.com/artist.jpg', description: 'URL to artist image' })
  imageUrl?: string | null = null;

  @ApiProperty({ example: 'https://hillsong.com', description: 'Artist website' })
  website?: string | null = null;

  @ApiProperty({ example: true, description: 'Whether the artist is featured' })
  isFeatured: boolean = false;

  @ApiProperty({ example: true, description: 'Whether the artist is active' })
  isActive: boolean = true;

  @ApiProperty({ description: 'Social media links', type: 'object' })
  socialLinks?: JsonValue | Record<string, any> | null = null;

  @ApiProperty({ example: 3245, description: 'Number of views for this artist' })
  viewCount: number = 0;

  @ApiProperty({ example: 187, description: 'Number of unique viewers for this artist' })
  uniqueViewers: number = 0;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last time this artist was viewed', required: false })
  lastViewed?: Date | null = null;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}
