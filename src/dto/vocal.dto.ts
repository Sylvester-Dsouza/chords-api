import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsUrl, Min, IsArray } from 'class-validator';
import { VocalType } from '@prisma/client';

// Vocal Library DTOs (Centralized Audio Library)
export class CreateVocalLibraryDto {
  @ApiProperty({ example: 'Lip Trills Exercise', description: 'User-friendly name for the audio file' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'lip-trills-exercise.mp3', description: 'Original file name' })
  @IsString()
  fileName: string = '';

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
    example: ['beginner', 'warmup', 'lip-trills'], 
    description: 'Tags for better organization and search',
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ 
    example: 'A gentle lip trill exercise perfect for warming up the voice', 
    description: 'Detailed description of the audio file', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: 'uuid-category-id', 
    description: 'Optional category ID to assign the audio file to', 
    required: false 
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ 
    example: 0, 
    description: 'Display order within the category', 
    required: false, 
    default: 0 
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the audio file is active', 
    required: false, 
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVocalLibraryDto {
  @ApiProperty({ example: 'Lip Trills Exercise', description: 'User-friendly name for the audio file', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'lip-trills-exercise.mp3', description: 'Original file name', required: false })
  @IsString()
  @IsOptional()
  fileName?: string;

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
    example: ['beginner', 'warmup', 'lip-trills'], 
    description: 'Tags for better organization and search',
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ 
    example: 'A gentle lip trill exercise perfect for warming up the voice', 
    description: 'Detailed description of the audio file', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the audio file is active', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class VocalLibraryResponseDto {
  @ApiProperty({ description: 'Audio file ID' })
  id: string = '';

  @ApiProperty({ example: 'Lip Trills Exercise', description: 'User-friendly name for the audio file' })
  name: string = '';

  @ApiProperty({ example: 'lip-trills-exercise.mp3', description: 'Original file name' })
  fileName: string = '';

  @ApiProperty({ 
    example: 'https://supabase.storage.url/audio.mp3', 
    description: 'Audio file URL from Supabase storage' 
  })
  audioFileUrl: string = '';

  @ApiProperty({ example: 180, description: 'Duration in seconds' })
  durationSeconds: number = 0;

  @ApiProperty({ example: 2048576, description: 'File size in bytes' })
  fileSizeBytes: number = 0;

  @ApiProperty({ 
    example: ['beginner', 'warmup', 'lip-trills'], 
    description: 'Tags for organization and search',
    type: [String]
  })
  tags: string[] = [];

  @ApiProperty({ 
    example: 'A gentle lip trill exercise perfect for warming up the voice', 
    description: 'Detailed description of the audio file' 
  })
  description: string = '';

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Upload timestamp' })
  uploadedAt: string = '';

  @ApiProperty({ example: true, description: 'Whether the audio file is active' })
  isActive: boolean = true;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string = '';

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Last update timestamp' })
  updatedAt: string = '';

  @ApiProperty({ 
    description: 'Number of vocal items using this audio file',
    example: 3
  })
  usageCount?: number;
}

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

// Vocal Item DTOs (Now references audio library)
export class CreateVocalItemDto {
  @ApiProperty({ description: 'Category ID this item belongs to (optional)', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Audio file ID from the audio library' })
  @IsString()
  audioFileId: string = '';

  @ApiProperty({ 
    example: 'Custom Exercise Name', 
    description: 'Optional override name (uses audio file name if not provided)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  name?: string;

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

  @ApiProperty({ description: 'Audio file ID from the audio library', required: false })
  @IsString()
  @IsOptional()
  audioFileId?: string;

  @ApiProperty({ 
    example: 'Custom Exercise Name', 
    description: 'Optional override name (uses audio file name if not provided)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  name?: string;

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

  @ApiProperty({ description: 'Audio file ID from the audio library' })
  audioFileId: string = '';

  @ApiProperty({ example: 'Custom Exercise Name', description: 'Item name (uses audio file name if not overridden)' })
  name: string = '';

  @ApiProperty({ example: 1, description: 'Display order for sorting' })
  displayOrder: number = 0;

  @ApiProperty({ example: true, description: 'Whether the item is active' })
  isActive: boolean = true;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();

  @ApiProperty({ 
    description: 'Audio file details',
    type: () => VocalLibraryResponseDto
  })
  audioFile?: VocalLibraryResponseDto;
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

// Customer Vocal Category DTOs
export class CreateCustomerVocalCategoryDto {
  @ApiProperty({ example: 'My Quick Warmup', description: 'Category name' })
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
    example: 'My personal warmup routine for quick sessions', 
    description: 'Category description', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: false, 
    description: 'Whether to make this category public', 
    required: false, 
    default: false 
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateCustomerVocalCategoryDto {
  @ApiProperty({ example: 'My Updated Warmup', description: 'Category name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    example: 'Updated description for my warmup routine', 
    description: 'Category description', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether to make this category public', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class AddItemToCustomerCategoryDto {
  @ApiProperty({ example: 'audio-file-uuid', description: 'Audio file ID to add to category' })
  @IsString()
  audioFileId: string = '';

  @ApiProperty({ 
    example: 'My Custom Exercise Name', 
    description: 'Optional custom name for this item in the category', 
    required: false 
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class CustomerVocalCategoryResponseDto {
  @ApiProperty({ example: 'uuid', description: 'Category ID' })
  id: string = '';

  @ApiProperty({ example: 'My Quick Warmup', description: 'Category name' })
  name: string = '';

  @ApiProperty({ example: 'WARMUP', description: 'Category type', enum: VocalType })
  type: VocalType = VocalType.WARMUP;

  @ApiProperty({ example: 'My personal warmup routine', description: 'Category description' })
  description?: string;

  @ApiProperty({ example: 0, description: 'Display order for sorting' })
  displayOrder: number = 0;

  @ApiProperty({ example: true, description: 'Whether category is active' })
  isActive: boolean = true;

  @ApiProperty({ example: false, description: 'Whether category is public' })
  isPublic: boolean = false;

  @ApiProperty({ example: false, description: 'Whether category is official admin content' })
  isOfficial: boolean = false;

  @ApiProperty({ example: 'customer-uuid', description: 'Customer who created this category' })
  customerId: string = '';

  @ApiProperty({ example: 5, description: 'Number of items in category' })
  itemCount: number = 0;

  @ApiProperty({ example: 0, description: 'Number of likes on this category' })
  likeCount: number = 0;

  @ApiProperty({ example: false, description: 'Whether current user has liked this category' })
  isLiked: boolean = false;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();
}

export class CustomerVocalCategoryWithItemsResponseDto extends CustomerVocalCategoryResponseDto {
  @ApiProperty({ description: 'Items in this category', type: [VocalItemResponseDto] })
  items: VocalItemResponseDto[] = [];
}
