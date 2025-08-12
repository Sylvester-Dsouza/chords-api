import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';
import { UploadService } from './upload.service';
import { CachePrefix } from '../constants/cache.constants';
import {
  CreateVocalCategoryDto,
  UpdateVocalCategoryDto,
  VocalCategoryResponseDto,
  VocalCategoryWithItemsResponseDto,
  CreateVocalItemDto,
  UpdateVocalItemDto,
  VocalItemResponseDto,
  CreateVocalLibraryDto,
  UpdateVocalLibraryDto,
  VocalLibraryResponseDto,
  ReorderVocalCategoriesDto,
  ReorderVocalItemsDto,
  CreateCustomerVocalCategoryDto,
  UpdateCustomerVocalCategoryDto,
  AddItemToCustomerCategoryDto,
  CustomerVocalCategoryResponseDto,
  CustomerVocalCategoryWithItemsResponseDto,
} from '../dto/vocal.dto';
import { VocalType } from '@prisma/client';

@Injectable()
export class VocalService {
  private readonly logger = new Logger(VocalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly uploadService: UploadService
  ) {}

  // Audio File Methods (Centralized Audio Library)
  async createAudioFile(createVocalLibraryDto: CreateVocalLibraryDto): Promise<VocalLibraryResponseDto> {
    const audioFile = await this.prisma.vocalLibrary.create({
      data: createVocalLibraryDto,
    });

    // Invalidate cache
    await this.invalidateAudioFilesCache();
    this.logger.debug(`Created vocal audio file ${audioFile.id}`);

    return this.convertAudioFileToDto(audioFile);
  }

  async findAllAudioFiles(onlyActive: boolean = false): Promise<VocalLibraryResponseDto[]> {
    const cacheKey = `${CachePrefix.VOCAL_AUDIO_FILES}:all:${onlyActive}`;
    
    const cached = await this.cacheService.get<VocalLibraryResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};
    if (onlyActive) where.isActive = true;

    const audioFiles = await this.prisma.vocalLibrary.findMany({
      where,
      include: {
        _count: {
          select: { customerVocalItems: true }
        }
      },
      orderBy: [
        { uploadedAt: 'desc' },
        { name: 'asc' }
      ]
    });

    const result = audioFiles.map(audioFile => this.convertAudioFileToDto(audioFile));

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async findAudioFileById(id: string): Promise<VocalLibraryResponseDto> {
    const cacheKey = `${CachePrefix.VOCAL_AUDIO_FILES}:${id}`;

    const cached = await this.cacheService.get<VocalLibraryResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const audioFile = await this.prisma.vocalLibrary.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customerVocalItems: true }
        }
      }
    });

    if (!audioFile) {
      throw new NotFoundException(`Vocal audio file with ID ${id} not found`);
    }

    const result = this.convertAudioFileToDto(audioFile);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async updateAudioFile(id: string, updateVocalLibraryDto: UpdateVocalLibraryDto): Promise<VocalLibraryResponseDto> {
    // Check if audio file exists
    const existingAudioFile = await this.prisma.vocalLibrary.findUnique({
      where: { id }
    });

    if (!existingAudioFile) {
      throw new NotFoundException(`Vocal audio file with ID ${id} not found`);
    }

    const audioFile = await this.prisma.vocalLibrary.update({
      where: { id },
      data: updateVocalLibraryDto,
      include: {
        _count: {
          select: { customerVocalItems: true }
        }
      }
    });

    // Invalidate cache
    await this.invalidateAudioFilesCache();
    await this.cacheService.delete(`${CachePrefix.VOCAL_AUDIO_FILES}:${id}`);
    this.logger.debug(`Updated vocal audio file ${id}`);

    return this.convertAudioFileToDto(audioFile);
  }

  async deleteAudioFile(id: string): Promise<void> {
    // Check if audio file exists
    const existingAudioFile = await this.prisma.vocalLibrary.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customerVocalItems: true }
        }
      }
    });

    if (!existingAudioFile) {
      throw new NotFoundException(`Vocal audio file with ID ${id} not found`);
    }

    // Check if audio file is being used by any vocal items
    if (existingAudioFile._count.customerVocalItems > 0) {
      throw new BadRequestException(`Cannot delete audio file ${id} as it is being used by ${existingAudioFile._count.customerVocalItems} vocal item(s)`);
    }

    await this.prisma.vocalLibrary.delete({
      where: { id }
    });

    // Invalidate cache
    await this.invalidateAudioFilesCache();
    await this.cacheService.delete(`${CachePrefix.VOCAL_AUDIO_FILES}:${id}`);
    this.logger.debug(`Deleted vocal audio file ${id}`);
  }

  async searchAudioFiles(query: string, tags?: string[]): Promise<VocalLibraryResponseDto[]> {
    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { fileName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags
      };
    }

    const audioFiles = await this.prisma.vocalLibrary.findMany({
      where,
      include: {
        _count: {
          select: { customerVocalItems: true }
        }
      },
      orderBy: [
        { uploadedAt: 'desc' },
        { name: 'asc' }
      ]
    });

    return audioFiles.map(audioFile => this.convertAudioFileToDto(audioFile));
  }

  // Category Methods
  async createCategory(createVocalCategoryDto: CreateVocalCategoryDto): Promise<VocalCategoryResponseDto> {
    const category = await this.prisma.vocalCategory.create({
      data: createVocalCategoryDto,
    });

    // Invalidate cache
    await this.invalidateCategoriesCache();
    this.logger.debug(`Created vocal category ${category.id}`);

    return this.convertCategoryToDto(category);
  }

  async findAllCategories(
    type?: VocalType,
    onlyActive: boolean = false
  ): Promise<VocalCategoryResponseDto[]> {
    const cacheKey = `${CachePrefix.VOCAL_CATEGORIES}:all:${type || 'all'}:${onlyActive}`;
    
    const cached = await this.cacheService.get<VocalCategoryResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};
    if (type) where.type = type;
    if (onlyActive) where.isActive = true;

    const categories = await this.prisma.vocalCategory.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        _count: {
          select: { categoryItems: true }
        }
      }
    });

    const result = categories.map(category => ({
      ...this.convertCategoryToDto(category),
      itemCount: category._count.categoryItems
    }));

    await this.cacheService.set(cacheKey, result, 300); // 5 minutes cache
    return result;
  }

  async findCategoryById(id: string): Promise<VocalCategoryResponseDto> {
    const cacheKey = `${CachePrefix.VOCAL_CATEGORIES}:${id}`;
    
    const cached = await this.cacheService.get<VocalCategoryResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const category = await this.prisma.vocalCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { categoryItems: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Vocal category with ID ${id} not found`);
    }

    const result = {
      ...this.convertCategoryToDto(category),
      itemCount: category._count.categoryItems
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async findCategoryWithItems(id: string): Promise<VocalCategoryWithItemsResponseDto> {
    const cacheKey = `${CachePrefix.VOCAL_CATEGORIES}:${id}:with-items`;
    
    const cached = await this.cacheService.get<VocalCategoryWithItemsResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const category = await this.prisma.vocalCategory.findUnique({
      where: { id },
      include: {
        categoryItems: {
          where: { 
            libraryItem: { isActive: true }
          },
          include: {
            libraryItem: true
          },
          orderBy: [
            { displayOrder: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Vocal category with ID ${id} not found`);
    }

    const items = category.categoryItems.map(categoryItem => ({
      ...categoryItem.libraryItem,
      displayOrder: categoryItem.displayOrder,
      categoryId: categoryItem.categoryId
    }));

    const result: VocalCategoryWithItemsResponseDto = {
      ...this.convertCategoryToDto(category),
      itemCount: category.categoryItems.length,
      items: items.map((item: any) => this.convertLibraryItemToDto(item))
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async updateCategory(id: string, updateVocalCategoryDto: UpdateVocalCategoryDto): Promise<VocalCategoryResponseDto> {
    const existingCategory = await this.prisma.vocalCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Vocal category with ID ${id} not found`);
    }

    const category = await this.prisma.vocalCategory.update({
      where: { id },
      data: updateVocalCategoryDto,
    });

    // Invalidate cache
    await this.invalidateCategoriesCache();
    await this.cacheService.delete(`${CachePrefix.VOCAL_CATEGORIES}:${id}`);
    await this.cacheService.delete(`${CachePrefix.VOCAL_CATEGORIES}:${id}:with-items`);
    
    this.logger.debug(`Updated vocal category ${id}`);

    return this.convertCategoryToDto(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const existingCategory = await this.prisma.vocalCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { categoryItems: true }
        }
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Vocal category with ID ${id} not found`);
    }

    if (existingCategory._count.categoryItems > 0) {
      throw new BadRequestException(`Cannot delete category with ${existingCategory._count.categoryItems} items. Delete items first.`);
    }

    await this.prisma.vocalCategory.delete({
      where: { id }
    });

    // Invalidate cache
    await this.invalidateCategoriesCache();
    await this.cacheService.delete(`${CachePrefix.VOCAL_CATEGORIES}:${id}`);
    await this.cacheService.delete(`${CachePrefix.VOCAL_CATEGORIES}:${id}:with-items`);
    
    this.logger.debug(`Deleted vocal category ${id}`);
  }

  async reorderCategories(reorderDto: ReorderVocalCategoriesDto): Promise<void> {
    const { categoryIds } = reorderDto;

    // Verify all categories exist
    const categories = await this.prisma.vocalCategory.findMany({
      where: {
        id: { in: categoryIds }
      }
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('One or more category IDs are invalid');
    }

    // Update display order
    const updatePromises = categoryIds.map((categoryId, index) =>
      this.prisma.vocalCategory.update({
        where: { id: categoryId },
        data: { displayOrder: index }
      })
    );

    await Promise.all(updatePromises);

    // Invalidate cache
    await this.invalidateCategoriesCache();
    this.logger.debug(`Reordered ${categoryIds.length} vocal categories`);
  }

  // Item Methods
  async createItem(createVocalItemDto: CreateVocalItemDto): Promise<VocalItemResponseDto> {
    // Verify category exists if provided
    if (createVocalItemDto.categoryId) {
      const category = await this.prisma.vocalCategory.findUnique({
        where: { id: createVocalItemDto.categoryId }
      });

      if (!category) {
        throw new NotFoundException(`Vocal category with ID ${createVocalItemDto.categoryId} not found`);
      }
    }

    // Update the VocalLibrary record with category and metadata
    const updateData: any = {
      displayOrder: createVocalItemDto.displayOrder || 0,
      isActive: createVocalItemDto.isActive ?? true,
    };

    if (createVocalItemDto.name) {
      updateData.name = createVocalItemDto.name;
    }

    if (createVocalItemDto.categoryId) {
      updateData.categoryId = createVocalItemDto.categoryId;
    }

    const libraryItem = await this.prisma.vocalLibrary.update({
      where: { id: createVocalItemDto.audioFileId },
      data: updateData,
      include: {
        categoryItems: {
          include: {
            category: true
          }
        }
      }
    });

    // Invalidate cache
    await this.invalidateItemsCache(createVocalItemDto.categoryId);
    this.logger.debug(`Updated vocal library item ${libraryItem.id} in category ${createVocalItemDto.categoryId || 'none'}`);

    return this.convertLibraryItemToDto(libraryItem);
  }

  async findAllItems(categoryId?: string, onlyActive: boolean = false): Promise<VocalItemResponseDto[]> {
    const cacheKey = `${CachePrefix.VOCAL_ITEMS}:all:${categoryId || 'all'}:${onlyActive}`;
    
    const cached = await this.cacheService.get<VocalItemResponseDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for vocal items: ${cacheKey}`);
      return cached;
    }

    let libraryItems;
    
    if (categoryId) {
      // Fetch items for a specific category using junction table
      const categoryItems = await this.prisma.vocalCategoryItem.findMany({
        where: {
          categoryId: categoryId,
          ...(onlyActive && {
            libraryItem: {
              isActive: true
            }
          })
        },
        include: {
          libraryItem: {
            include: {
              categoryItems: {
                include: {
                  category: true
                }
              }
            }
          },
          category: true
        },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      });
      
      libraryItems = categoryItems.map((item: any) => ({
        ...item.libraryItem,
        displayOrder: item.displayOrder,
        categoryId: item.categoryId,
        category: item.category
      }));
    } else {
      // Fetch all library items
      const whereClause: any = {};
      if (onlyActive) {
        whereClause.isActive = true;
      }
      
      libraryItems = await this.prisma.vocalLibrary.findMany({
        where: whereClause,
        include: {
          categoryItems: {
            include: {
              category: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });
    }

    const result = libraryItems.map((item: any) => this.convertLibraryItemToDto(item));
    
    await this.cacheService.set(cacheKey, result, 300);
    this.logger.debug(`Cached vocal items: ${cacheKey}`);
    
    return result;
  }

  async findItemById(id: string): Promise<VocalItemResponseDto> {
    const cacheKey = `${CachePrefix.VOCAL_ITEMS}:${id}`;
    

    const cached = await this.cacheService.get<VocalItemResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const libraryItem = await this.prisma.vocalLibrary.findUnique({
      where: { id },
      include: {
        categoryItems: {
          include: {
            category: true
          }
        }
      }
    });

    if (!libraryItem) {
      throw new NotFoundException(`Vocal library item with ID ${id} not found`);
    }

    const result = this.convertLibraryItemToDto(libraryItem);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async updateItem(id: string, updateVocalItemDto: UpdateVocalItemDto): Promise<VocalItemResponseDto> {
    const existingItem = await this.prisma.vocalLibrary.findUnique({
      where: { id },
      include: {
        categoryItems: {
          include: {
            category: true
          }
        }
      }
    });

    if (!existingItem) {
      throw new NotFoundException(`Vocal library item with ID ${id} not found`);
    }

    // Update the library item (excluding categoryId since it's handled via junction table)
    const { categoryId, displayOrder, ...updateData } = updateVocalItemDto;
    
    const libraryItem = await this.prisma.vocalLibrary.update({
      where: { id },
      data: updateData,
      include: {
        categoryItems: {
          include: {
            category: true
          }
        }
      }
    });

    // Handle category assignment if provided
    if (categoryId) {
      // Verify category exists
      const category = await this.prisma.vocalCategory.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        throw new NotFoundException(`Vocal category with ID ${categoryId} not found`);
      }

      // Create or update category assignment
      await this.prisma.vocalCategoryItem.upsert({
        where: {
          categoryId_libraryId: {
            categoryId: categoryId,
            libraryId: id
          }
        },
        create: {
          categoryId: categoryId,
          libraryId: id,
          displayOrder: displayOrder || 0
        },
        update: {
          displayOrder: displayOrder || 0
        }
      });
    }

    // Invalidate cache for all categories this item belongs to
    const categoryIds = existingItem.categoryItems.map(item => item.categoryId);
    for (const catId of categoryIds) {
      await this.invalidateItemsCache(catId);
    }
    if (categoryId && !categoryIds.includes(categoryId)) {
      await this.invalidateItemsCache(categoryId);
    }
    await this.cacheService.delete(`${CachePrefix.VOCAL_ITEMS}:${id}`);

    this.logger.debug(`Updated vocal library item ${id}`);

    return this.convertLibraryItemToDto(libraryItem);
  }

  async deleteItem(id: string): Promise<void> {
    const existingItem = await this.prisma.vocalLibrary.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customerVocalItems: true }
        },
        categoryItems: {
          select: { categoryId: true }
        }
      }
    });

    if (!existingItem) {
      throw new NotFoundException(`Vocal library item with ID ${id} not found`);
    }

    // Check if being used by customers
    if (existingItem._count.customerVocalItems > 0) {
      throw new BadRequestException(`Cannot delete audio file ${id} as it is being used by ${existingItem._count.customerVocalItems} customer vocal item(s)`);
    }

    // Delete the audio file from storage
    if (existingItem.audioFileUrl) {
      try {
        await this.uploadService.deleteFile(existingItem.audioFileUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete audio file from storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Delete from database (this will cascade delete VocalCategoryItem records)
    await this.prisma.vocalLibrary.delete({
      where: { id }
    });

    // Invalidate cache for all categories this item belonged to
    const categoryIds = existingItem.categoryItems.map(item => item.categoryId);
    for (const categoryId of categoryIds) {
      await this.invalidateItemsCache(categoryId);
    }
    await this.invalidateAudioFilesCache();
    await this.cacheService.delete(`${CachePrefix.VOCAL_ITEMS}:${id}`);
    await this.cacheService.delete(`${CachePrefix.VOCAL_AUDIO_FILES}:${id}`);

    this.logger.debug(`Deleted vocal library item ${id} completely`);
  }

  async reorderItems(categoryId: string, reorderDto: ReorderVocalItemsDto): Promise<void> {
    // Verify category exists
    const category = await this.prisma.vocalCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new NotFoundException(`Vocal category with ID ${categoryId} not found`);
    }

    // Update display orders in the junction table
    const updatePromises = reorderDto.itemIds.map((itemId, index) => 
      this.prisma.vocalCategoryItem.update({
        where: {
          categoryId_libraryId: {
            categoryId: categoryId,
            libraryId: itemId
          }
        },
        data: { displayOrder: index }
      })
    );

    await Promise.all(updatePromises);

    // Invalidate cache
    await this.invalidateItemsCache(categoryId);
    this.logger.debug(`Reordered ${reorderDto.itemIds.length} vocal library items in category ${categoryId}`);
  }

  // Helper methods
  private convertCategoryToDto(category: any): VocalCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private convertItemToDto(item: any): VocalItemResponseDto {
    return {
      id: item.id,
      categoryId: item.categoryId,
      audioFileId: item.audioFileId,
      name: item.name || item.audioFile?.name || '',
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      audioFile: item.audioFile ? this.convertAudioFileToDto(item.audioFile) : undefined,
    };
  }

  private convertLibraryItemToDto(libraryItem: any): VocalItemResponseDto {
    return {
      id: libraryItem.id,
      categoryId: libraryItem.categoryId,
      audioFileId: libraryItem.id, // Library item ID is the audio file ID
      name: libraryItem.name,
      displayOrder: libraryItem.displayOrder,
      isActive: libraryItem.isActive,
      createdAt: libraryItem.createdAt,
      updatedAt: libraryItem.updatedAt,
      audioFile: this.convertAudioFileToDto(libraryItem),
    };
  }

  private convertCustomerItemToDto(customerItem: any): VocalItemResponseDto {
    return {
      id: customerItem.id,
      categoryId: customerItem.categoryId,
      audioFileId: customerItem.libraryItemId,
      name: customerItem.name || customerItem.libraryItem?.name || '',
      displayOrder: customerItem.displayOrder,
      isActive: customerItem.isActive,
      createdAt: customerItem.createdAt,
      updatedAt: customerItem.updatedAt,
      audioFile: customerItem.libraryItem ? this.convertAudioFileToDto(customerItem.libraryItem) : undefined,
    };
  }

  private convertAudioFileToDto(audioFile: any): VocalLibraryResponseDto {
    return {
      id: audioFile.id,
      name: audioFile.name,
      fileName: audioFile.fileName,
      audioFileUrl: audioFile.audioFileUrl,
      durationSeconds: audioFile.durationSeconds,
      fileSizeBytes: Number(audioFile.fileSizeBytes), // Convert BigInt to number
      tags: audioFile.tags || [],
      description: audioFile.description || '',
      uploadedAt: audioFile.uploadedAt?.toISOString() || '',
      isActive: audioFile.isActive,
      createdAt: audioFile.createdAt?.toISOString() || '',
      updatedAt: audioFile.updatedAt?.toISOString() || '',
      usageCount: audioFile._count?.vocalItems || 0,
    };
  }

  private async invalidateCategoriesCache(): Promise<void> {
    await this.cacheService.deleteByPrefix(CachePrefix.VOCAL_CATEGORIES);
  }

  private async invalidateItemsCache(categoryId?: string): Promise<void> {
    // Clear all vocal items cache
    await this.cacheService.deleteByPrefix(CachePrefix.VOCAL_ITEMS);
    
    // Clear vocal categories cache
    await this.cacheService.deleteByPrefix(CachePrefix.VOCAL_CATEGORIES);
    
    // Clear customer vocal categories cache (this was missing!)
    await this.cacheService.deleteByPrefix('customer_vocal_categories');
    
    if (categoryId) {
      await this.cacheService.delete(`${CachePrefix.VOCAL_CATEGORIES}:${categoryId}:with-items`);
      // Also clear specific customer category cache
      await this.cacheService.delete(`customer_vocal_category:${categoryId}`);
    }
    
    this.logger.debug(`Invalidated all vocal caches${categoryId ? ` for category ${categoryId}` : ''}`);
  }

  private async invalidateAudioFilesCache(): Promise<void> {
    await this.cacheService.deleteByPrefix(CachePrefix.VOCAL_AUDIO_FILES);
  }

  // Upload Audio File Method
  async uploadAudioFile(
    file: Express.Multer.File,
    metadata: {
      name?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
      displayOrder?: number;
    }
  ): Promise<VocalLibraryResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (audio files only)
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/m4a',
      'audio/webm'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only audio files are allowed.');
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 50MB.');
    }

    try {
      // Upload file to Supabase storage
      const audioFileUrl = await this.uploadService.uploadFile(
        file.buffer,
        'vocal-audio', // folder name
        file.originalname,
        file.mimetype
      );

      if (!audioFileUrl) {
        throw new BadRequestException('Failed to upload file to storage');
      }

      // Get audio duration (simplified - you might want to use a library like ffprobe for accurate duration)
      const durationSeconds = 0; // Placeholder - implement actual duration detection if needed

      // Create VocalLibrary record (without categoryId/displayOrder since they're in junction table now)
      const createData: CreateVocalLibraryDto = {
        name: metadata.name || file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension
        fileName: file.originalname,
        audioFileUrl,
        durationSeconds,
        fileSizeBytes: file.size,
        tags: metadata.tags || [],
        description: metadata.description || '',
        isActive: true,
      };

      const audioFile = await this.createAudioFile(createData);

      // If categoryId is provided, create junction table record
      if (metadata.categoryId) {
        // Verify category exists
        const category = await this.prisma.vocalCategory.findUnique({
          where: { id: metadata.categoryId }
        });

        if (!category) {
          throw new NotFoundException(`Vocal category with ID ${metadata.categoryId} not found`);
        }

        // Create junction table record
        await this.prisma.vocalCategoryItem.create({
          data: {
            categoryId: metadata.categoryId,
            libraryId: audioFile.id,
            displayOrder: metadata.displayOrder || 0
          }
        });

        // Invalidate cache for the category
        await this.invalidateItemsCache(metadata.categoryId);
      }

      return audioFile;
    } catch (error) {
      this.logger.error(`Error uploading audio file: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to upload and process audio file');
    }
  }

  // Customer Vocal Category Methods
  async createCustomerCategory(customerId: string, createDto: CreateCustomerVocalCategoryDto): Promise<CustomerVocalCategoryResponseDto> {
    const category = await this.prisma.customerVocalCategory.create({
      data: {
        name: createDto.name,
        type: createDto.type,
        description: createDto.description,
        customerId,
        isPublic: createDto.isPublic || false,
        displayOrder: 0,
        isActive: true,
      },
      include: {
        _count: {
          select: { 
            items: true
 
          }
        }
      }
    });

    await this.invalidateCategoriesCache();
    return this.convertCustomerCategoryToDto(category, customerId);
  }

  async getCustomerCategories(customerId: string, type?: VocalType): Promise<CustomerVocalCategoryResponseDto[]> {
    const where: any = {
      customerId,
      isActive: true
    };

    if (type) {
      where.type = type;
    }

    const categories = await this.prisma.customerVocalCategory.findMany({
      where,
      include: {
        _count: {
          select: { 
            items: true
 
          }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return categories.map(category => this.convertCustomerCategoryToDto(category, customerId));
  }

  async getCustomerCategoryWithItems(customerId: string, categoryId: string): Promise<CustomerVocalCategoryWithItemsResponseDto> {
    const category = await this.prisma.customerVocalCategory.findFirst({
      where: {
        id: categoryId,
        customerId,
        isActive: true
      },
      include: {
        items: {
          where: { isActive: true },
          include: {
            libraryItem: true
          },
          orderBy: [
            { displayOrder: 'asc' },
            { createdAt: 'asc' }
          ]
        },
        _count: {
          select: { 
            items: true
 
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Customer vocal category with ID ${categoryId} not found`);
    }

    const result: CustomerVocalCategoryWithItemsResponseDto = {
      ...this.convertCustomerCategoryToDto(category, customerId),
      items: category.items.map(item => this.convertCustomerItemToDto(item))
    };

    return result;
  }

  async updateCustomerCategory(customerId: string, categoryId: string, updateDto: UpdateCustomerVocalCategoryDto): Promise<CustomerVocalCategoryResponseDto> {
    // Verify ownership
    const existingCategory = await this.prisma.customerVocalCategory.findFirst({
      where: {
        id: categoryId,
        customerId,
        isActive: true
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Customer vocal category with ID ${categoryId} not found`);
    }

    const category = await this.prisma.customerVocalCategory.update({
      where: { id: categoryId },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        isPublic: updateDto.isPublic,
      },
      include: {
        _count: {
          select: { 
            items: true
 
          }
        }
      }
    });

    // Invalidate cache
    await this.invalidateCategoriesCache();
    this.logger.debug(`Updated customer vocal category ${categoryId} for customer ${customerId}`);

    return this.convertCustomerCategoryToDto(category, customerId);
  }

  async deleteCustomerCategory(customerId: string, categoryId: string): Promise<void> {
    // Verify ownership
    const existingCategory = await this.prisma.customerVocalCategory.findFirst({
      where: {
        id: categoryId,
        customerId,
        isActive: true
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Customer vocal category with ID ${categoryId} not found`);
    }

    await this.prisma.customerVocalCategory.delete({
      where: { id: categoryId }
    });

    // Invalidate cache
    await this.invalidateCategoriesCache();
    this.logger.debug(`Deleted customer vocal category ${categoryId} for customer ${customerId}`);
  }

  async getCustomerItems(customerId: string): Promise<VocalItemResponseDto[]> {
    const items = await this.prisma.customerVocalItem.findMany({
      where: {
        category: {
          customerId: customerId
        },
        isActive: true
      },
      include: {
        libraryItem: true,
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return items.map(item => ({
      id: item.id,
      audioFileId: item.libraryItemId,
      name: item.name || item.libraryItem.name,
      title: item.libraryItem.name,
      description: item.libraryItem.description,
      audioUrl: item.libraryItem.audioFileUrl,
      duration: item.libraryItem.durationSeconds,
      type: 'EXERCISE', // Default type since VocalLibrary doesn't have type field
      difficulty: 'BEGINNER', // Default difficulty since VocalLibrary doesn't have difficulty field
      tags: item.libraryItem.tags,
      categoryId: item.categoryId,
      categoryName: item.category?.name || 'Unknown',
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      isDownloaded: false, // This would need to be determined by the client
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  }

  async addItemToCustomerCategory(customerId: string, categoryId: string, addItemDto: AddItemToCustomerCategoryDto): Promise<VocalItemResponseDto> {
    // Verify category ownership
    const category = await this.prisma.customerVocalCategory.findFirst({
      where: {
        id: categoryId,
        customerId,
        isActive: true
      }
    });

    if (!category) {
      throw new NotFoundException(`Customer vocal category with ID ${categoryId} not found`);
    }

    // Verify audio file exists
    const audioFile = await this.prisma.vocalLibrary.findUnique({
      where: { id: addItemDto.audioFileId }
    });

    if (!audioFile) {
      throw new NotFoundException(`Audio file with ID ${addItemDto.audioFileId} not found`);
    }

    // Get next display order
    const maxOrder = await this.prisma.customerVocalItem.findFirst({
      where: { categoryId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true }
    });

    const item = await this.prisma.customerVocalItem.create({
      data: {
        categoryId,
        libraryItemId: addItemDto.audioFileId,
        name: addItemDto.name,
        displayOrder: (maxOrder?.displayOrder || 0) + 1,
        isActive: true,
      },
      include: {
        libraryItem: true,
        category: true
      }
    });

    // Invalidate cache
    await this.invalidateItemsCache(categoryId);
    this.logger.debug(`Added item ${item.id} to customer category ${categoryId}`);

    return this.convertItemToDto(item);
  }

  async removeItemFromCustomerCategory(customerId: string, categoryId: string, itemId: string): Promise<void> {
    // Verify category ownership
    const category = await this.prisma.customerVocalCategory.findFirst({
      where: {
        id: categoryId,
        customerId,
        isActive: true
      }
    });

    if (!category) {
      throw new NotFoundException(`Customer vocal category with ID ${categoryId} not found`);
    }

    // Verify item exists in this category
    const item = await this.prisma.customerVocalItem.findFirst({
      where: {
        id: itemId,
        categoryId,
        isActive: true
      }
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found in category ${categoryId}`);
    }

    await this.prisma.customerVocalItem.delete({
      where: { id: itemId }
    });

    // Invalidate cache
    await this.invalidateItemsCache(categoryId);
    this.logger.debug(`Removed item ${itemId} from customer category ${categoryId}`);
  }

  async reorderCustomerCategoryItems(customerId: string, categoryId: string, reorderDto: ReorderVocalItemsDto): Promise<void> {
    // Verify category ownership
    const category = await this.prisma.customerVocalCategory.findFirst({
      where: {
        id: categoryId,
        customerId,
        isActive: true
      }
    });

    if (!category) {
      throw new NotFoundException(`Customer vocal category with ID ${categoryId} not found`);
    }

    // Update display orders
    const updatePromises = reorderDto.itemIds.map((itemId, index) =>
      this.prisma.customerVocalItem.update({
        where: { 
          id: itemId,
          categoryId // Ensure item belongs to this category
        },
        data: { displayOrder: index + 1 }
      })
    );

    await Promise.all(updatePromises);

    // Invalidate cache
    await this.invalidateItemsCache(categoryId);
    this.logger.debug(`Reordered items in customer category ${categoryId}`);
  }

  async getPublicCustomerCategories(type?: VocalType, limit?: number): Promise<CustomerVocalCategoryResponseDto[]> {
    const where: any = {
      isPublic: true,
      isActive: true
    };

    if (type) {
      where.type = type;
    }

    const categories = await this.prisma.customerVocalCategory.findMany({
      where,
      include: {
        _count: {
          select: { 
            items: true
 
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit || 50
    });

    return categories.map(category => this.convertCustomerCategoryToDto(category));
  }

  // Note: toggleCustomerCategoryLike method removed since CustomerVocalCategoryLike model was removed from schema

  private convertCustomerCategoryToDto(category: any, currentCustomerId?: string): CustomerVocalCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      description: category.description,
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive ?? true,
      isPublic: category.isPublic ?? false,
      isOfficial: false, // Customer categories are never official
      customerId: category.customerId,
      itemCount: category._count?.items || 0,
      likeCount: category._count?.likes || 0,
      isLiked: currentCustomerId ? false : false, // TODO: Check if current customer liked this category
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
