import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsUrl, Min } from 'class-validator';
import { VocalType } from '@prisma/client';

// Vocal Category DTOs
export class CreateVocalCategoryDto {
  @ApiProperty({ example: 'Stage Warmups', description: 'Category name' })
  @IsString()
  name: string = '';

  @ApiProperty({ 
    example: 'WARMUP', 
    description: 'Type of vocal category',
    enum: VocalType 
  })
  @IsEnum(VocalType)
  type: VocalType = VocalType.WARMUP;

  @ApiProperty({ 
    example: 'Quick warmups perfect for stage preparation', 
    description: 'Category description', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: 1, 
    description: 'Display order for sorting', 
    required: false, 
    default: 0 
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the category is active', 
    required: false, 
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVocalCategoryDto {
  @ApiProperty({ example: 'Stage Warmups', description: 'Category name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    example: 'WARMUP', 
    description: 'Type of vocal category',
    enum: VocalType,
    required: false 
  })
  @IsEnum(VocalType)
  @IsOptional()
  type?: VocalType;

  @ApiProperty({ 
    example: 'Quick warmups perfect for stage preparation', 
    description: 'Category description', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: 1, 
    description: 'Display order for sorting', 
    required: false 
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the category is active', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class VocalCategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  id: string = '';

  @ApiProperty({ example: 'Stage Warmups', description: 'Category name' })
  name: string = '';

  @ApiProperty({ 
    example: 'WARMUP', 
    description: 'Type of vocal category',
    enum: VocalType 
  })
  type: VocalType = VocalType.WARMUP;

  @ApiProperty({ 
    example: 'Quick warmups perfect for stage preparation', 
    description: 'Category description' 
  })
  description?: string | null = null;

  @ApiProperty({ example: 1, description: 'Display order for sorting' })
  displayOrder: number = 0;

  @ApiProperty({ example: true, description: 'Whether the category is active' })
  isActive: boolean = true;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();

  @ApiProperty({ description: 'Number of items in this category' })
  itemCount?: number = 0;
}

// Vocal Item DTOs
export class CreateVocalItemDto {
  @ApiProperty({ description: 'Category ID this item belongs to' })
  @IsString()
  categoryId: string = '';

  @ApiProperty({ example: 'Lip Trills Exercise', description: 'Item name' })
  @IsString()
  name: string = '';

  @ApiProperty({ 
    example: 'https://supabase.storage.url/audio.mp3', 
    description: 'Audio file URL from Supabase storage' 
  })
  @IsUrl()
  audioFileUrl: string = '';

  @ApiProperty({ example: 180, description: 'Duration in seconds' })
  @IsInt()
  @Min(1)
  durationSeconds: number = 0;

  @ApiProperty({ example: 2048576, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  fileSizeBytes: number = 0;

  @ApiProperty({ 
    example: 1, 
    description: 'Display order for sorting', 
    required: false, 
    default: 0 
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the item is active', 
    required: false, 
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVocalItemDto {
  @ApiProperty({ description: 'Category ID this item belongs to', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'Lip Trills Exercise', description: 'Item name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    example: 'https://supabase.storage.url/audio.mp3', 
    description: 'Audio file URL from Supabase storage',
    required: false 
  })
  @IsUrl()
  @IsOptional()
  audioFileUrl?: string;

  @ApiProperty({ example: 180, description: 'Duration in seconds', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationSeconds?: number;

  @ApiProperty({ example: 2048576, description: 'File size in bytes', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  fileSizeBytes?: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Display order for sorting', 
    required: false 
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the item is active', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class VocalItemResponseDto {
  @ApiProperty({ description: 'Item ID' })
  id: string = '';

  @ApiProperty({ description: 'Category ID this item belongs to' })
  categoryId: string = '';

  @ApiProperty({ example: 'Lip Trills Exercise', description: 'Item name' })
  name: string = '';

  @ApiProperty({ 
    example: 'https://supabase.storage.url/audio.mp3', 
    description: 'Audio file URL from Supabase storage' 
  })
  audioFileUrl: string = '';

  @ApiProperty({ example: 180, description: 'Duration in seconds' })
  durationSeconds: number = 0;

  @ApiProperty({ example: 2048576, description: 'File size in bytes' })
  fileSizeBytes: number = 0;

  @ApiProperty({ example: 1, description: 'Display order for sorting' })
  displayOrder: number = 0;

  @ApiProperty({ example: true, description: 'Whether the item is active' })
  isActive: boolean = true;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}

// Combined response DTOs
export class VocalCategoryWithItemsResponseDto extends VocalCategoryResponseDto {
  @ApiProperty({ description: 'Items in this category', type: [VocalItemResponseDto] })
  items: VocalItemResponseDto[] = [];
}

// Reorder DTOs
export class ReorderVocalCategoriesDto {
  @ApiProperty({ 
    example: ['uuid1', 'uuid2', 'uuid3'], 
    description: 'Array of category IDs in the desired order' 
  })
  @IsString({ each: true })
  categoryIds: string[] = [];
}

export class ReorderVocalItemsDto {
  @ApiProperty({ 
    example: ['uuid1', 'uuid2', 'uuid3'], 
    description: 'Array of item IDs in the desired order' 
  })
  @IsString({ each: true })
  itemIds: string[] = [];
}
