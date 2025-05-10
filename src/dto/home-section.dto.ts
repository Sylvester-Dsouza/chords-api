import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { SectionType } from '@prisma/client';
import { BannerItemDto, CreateBannerItemDto } from '../dto/banner-item.dto';

export class CreateHomeSectionDto {
  @ApiProperty({ description: 'Title of the section', example: 'Seasonal Collections' })
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiProperty({
    description: 'Type of content in this section',
    enum: SectionType,
    example: SectionType.COLLECTIONS,
    enumName: 'SectionType'
  })
  @IsEnum(SectionType, { message: 'Type must be one of: COLLECTIONS, SONGS, ARTISTS, BANNER' })
  type: SectionType = SectionType.COLLECTIONS;

  @ApiPropertyOptional({
    description: 'Display order on home page (lower numbers appear first)',
    example: 0,
    default: 0
  })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether this section is active and should be displayed',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Number of items to display in this section (not used for BANNER type)',
    example: 10,
    default: 10
  })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  itemCount?: number;

  @ApiPropertyOptional({
    description: 'Filter to apply for non-banner sections (e.g., "seasonal", "trending", "new"). Not used for BANNER type.',
    example: 'seasonal'
  })
  @IsString()
  @IsOptional()
  filterType?: string;

  @ApiPropertyOptional({
    description: 'Optional specific item IDs to include for non-banner sections. Not used for BANNER type.',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  itemIds?: string[];

  @ApiPropertyOptional({
    description: 'Banner items (only used when type is BANNER). You can create the section first and add banner items later.',
    type: [CreateBannerItemDto]
  })
  @IsArray()
  @IsOptional()
  bannerItems?: CreateBannerItemDto[];
}

export class UpdateHomeSectionDto {
  @ApiPropertyOptional({ description: 'Title of the section', example: 'Seasonal Collections' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Type of content in this section',
    enum: SectionType,
    example: SectionType.COLLECTIONS
  })
  @IsEnum(SectionType)
  @IsOptional()
  type?: SectionType;

  @ApiPropertyOptional({
    description: 'Display order on home page (lower numbers appear first)',
    example: 0
  })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether this section is active and should be displayed',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Number of items to display in this section (not used for BANNER type)',
    example: 10
  })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  itemCount?: number;

  @ApiPropertyOptional({
    description: 'Filter to apply for non-banner sections (e.g., "seasonal", "trending", "new"). Not used for BANNER type.',
    example: 'seasonal'
  })
  @IsString()
  @IsOptional()
  filterType?: string;

  @ApiPropertyOptional({
    description: 'Optional specific item IDs to include for non-banner sections. Not used for BANNER type.',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  itemIds?: string[];
}

export class HomeSectionDto {
  @ApiProperty({ description: 'Unique identifier', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string = '';

  @ApiProperty({ description: 'Title of the section', example: 'Seasonal Collections' })
  title: string = '';

  @ApiProperty({
    description: 'Type of content in this section',
    enum: SectionType,
    example: SectionType.COLLECTIONS
  })
  type: SectionType = SectionType.COLLECTIONS;

  @ApiProperty({
    description: 'Display order on home page (lower numbers appear first)',
    example: 0
  })
  order: number = 0;

  @ApiProperty({
    description: 'Whether this section is active and should be displayed',
    example: true
  })
  isActive: boolean = true;

  @ApiProperty({
    description: 'Number of items to display in this section',
    example: 10
  })
  itemCount: number = 10;

  @ApiProperty({
    description: 'Filter to apply (e.g., "seasonal", "trending", "new")',
    example: 'seasonal',
    required: false
  })
  filterType: string | null = null;

  @ApiProperty({
    description: 'Optional specific item IDs to include',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  itemIds: string[] = [];

  @ApiProperty({
    description: 'Banner items (only used when type is BANNER)',
    type: [BannerItemDto]
  })
  bannerItems?: BannerItemDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date = new Date();

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date = new Date();
}

export class ReorderHomeSectionsDto {
  @ApiProperty({
    description: 'Array of section IDs in the desired order',
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  sectionIds: string[] = [];
}
