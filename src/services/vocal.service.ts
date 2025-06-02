import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService } from './cache.service';
import { CachePrefix } from '../constants/cache.constants';
import {
  CreateVocalCategoryDto,
  UpdateVocalCategoryDto,
  VocalCategoryResponseDto,
  VocalCategoryWithItemsResponseDto,
  CreateVocalItemDto,
  UpdateVocalItemDto,
  VocalItemResponseDto,
  ReorderVocalCategoriesDto,
  ReorderVocalItemsDto,
} from '../dto/vocal.dto';
import { VocalType } from '@prisma/client';

@Injectable()
export class VocalService {
  private readonly logger = new Logger(VocalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

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
          select: { items: true }
        }
      }
    });

    const result = categories.map(category => ({
      ...this.convertCategoryToDto(category),
      itemCount: category._count.items
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
          select: { items: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Vocal category with ID ${id} not found`);
    }

    const result = {
      ...this.convertCategoryToDto(category),
      itemCount: category._count.items
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
        items: {
          where: { isActive: true },
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

    const result: VocalCategoryWithItemsResponseDto = {
      ...this.convertCategoryToDto(category),
      itemCount: category.items.length,
      items: category.items.map(item => this.convertItemToDto(item))
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
          select: { items: true }
        }
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Vocal category with ID ${id} not found`);
    }

    if (existingCategory._count.items > 0) {
      throw new BadRequestException(`Cannot delete category with ${existingCategory._count.items} items. Delete items first.`);
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
    // Verify category exists
    const category = await this.prisma.vocalCategory.findUnique({
      where: { id: createVocalItemDto.categoryId }
    });

    if (!category) {
      throw new NotFoundException(`Vocal category with ID ${createVocalItemDto.categoryId} not found`);
    }

    const item = await this.prisma.vocalItem.create({
      data: createVocalItemDto,
    });

    // Invalidate cache
    await this.invalidateItemsCache(createVocalItemDto.categoryId);
    this.logger.debug(`Created vocal item ${item.id} in category ${createVocalItemDto.categoryId}`);

    return this.convertItemToDto(item);
  }

  async findAllItems(categoryId?: string, onlyActive: boolean = false): Promise<VocalItemResponseDto[]> {
    const cacheKey = `${CachePrefix.VOCAL_ITEMS}:all:${categoryId || 'all'}:${onlyActive}`;
    
    const cached = await this.cacheService.get<VocalItemResponseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (onlyActive) where.isActive = true;

    const items = await this.prisma.vocalItem.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    const result = items.map(item => this.convertItemToDto(item));

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async findItemById(id: string): Promise<VocalItemResponseDto> {
    const cacheKey = `${CachePrefix.VOCAL_ITEMS}:${id}`;

    const cached = await this.cacheService.get<VocalItemResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const item = await this.prisma.vocalItem.findUnique({
      where: { id }
    });

    if (!item) {
      throw new NotFoundException(`Vocal item with ID ${id} not found`);
    }

    const result = this.convertItemToDto(item);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  async updateItem(id: string, updateVocalItemDto: UpdateVocalItemDto): Promise<VocalItemResponseDto> {
    const existingItem = await this.prisma.vocalItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      throw new NotFoundException(`Vocal item with ID ${id} not found`);
    }

    // If categoryId is being updated, verify the new category exists
    if (updateVocalItemDto.categoryId && updateVocalItemDto.categoryId !== existingItem.categoryId) {
      const category = await this.prisma.vocalCategory.findUnique({
        where: { id: updateVocalItemDto.categoryId }
      });

      if (!category) {
        throw new NotFoundException(`Vocal category with ID ${updateVocalItemDto.categoryId} not found`);
      }
    }

    const item = await this.prisma.vocalItem.update({
      where: { id },
      data: updateVocalItemDto,
    });

    // Invalidate cache
    await this.invalidateItemsCache(existingItem.categoryId);
    if (updateVocalItemDto.categoryId && updateVocalItemDto.categoryId !== existingItem.categoryId) {
      await this.invalidateItemsCache(updateVocalItemDto.categoryId);
    }
    await this.cacheService.delete(`${CachePrefix.VOCAL_ITEMS}:${id}`);

    this.logger.debug(`Updated vocal item ${id}`);

    return this.convertItemToDto(item);
  }

  async deleteItem(id: string): Promise<void> {
    const existingItem = await this.prisma.vocalItem.findUnique({
      where: { id }
    });

    if (!existingItem) {
      throw new NotFoundException(`Vocal item with ID ${id} not found`);
    }

    await this.prisma.vocalItem.delete({
      where: { id }
    });

    // Invalidate cache
    await this.invalidateItemsCache(existingItem.categoryId);
    await this.cacheService.delete(`${CachePrefix.VOCAL_ITEMS}:${id}`);

    this.logger.debug(`Deleted vocal item ${id}`);
  }

  async reorderItems(categoryId: string, reorderDto: ReorderVocalItemsDto): Promise<void> {
    const { itemIds } = reorderDto;

    // Verify all items exist and belong to the specified category
    const items = await this.prisma.vocalItem.findMany({
      where: {
        id: { in: itemIds },
        categoryId: categoryId
      }
    });

    if (items.length !== itemIds.length) {
      throw new BadRequestException('One or more item IDs are invalid or do not belong to the specified category');
    }

    // Update display order
    const updatePromises = itemIds.map((itemId, index) =>
      this.prisma.vocalItem.update({
        where: { id: itemId },
        data: { displayOrder: index }
      })
    );

    await Promise.all(updatePromises);

    // Invalidate cache
    await this.invalidateItemsCache(categoryId);
    this.logger.debug(`Reordered ${itemIds.length} vocal items in category ${categoryId}`);
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
      name: item.name,
      audioFileUrl: item.audioFileUrl,
      durationSeconds: item.durationSeconds,
      fileSizeBytes: Number(item.fileSizeBytes), // Convert BigInt to number
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async invalidateCategoriesCache(): Promise<void> {
    await this.cacheService.deleteByPrefix(CachePrefix.VOCAL_CATEGORIES);
  }

  private async invalidateItemsCache(categoryId?: string): Promise<void> {
    await this.cacheService.deleteByPrefix(CachePrefix.VOCAL_ITEMS);
    if (categoryId) {
      await this.cacheService.delete(`${CachePrefix.VOCAL_CATEGORIES}:${categoryId}:with-items`);
    }
  }
}
