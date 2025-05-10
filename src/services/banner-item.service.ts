import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateBannerItemDto, UpdateBannerItemDto, ReorderBannerItemsDto, LinkType } from '../dto/banner-item.dto';
import { BannerItem, SectionType } from '@prisma/client';

@Injectable()
export class BannerItemService {
  constructor(private prisma: PrismaService) {}

  // Create a new banner item
  async create(homeSectionId: string, createBannerItemDto: CreateBannerItemDto): Promise<BannerItem> {
    // Check if the home section exists and is of type BANNER
    const homeSection = await this.prisma.homeSection.findUnique({
      where: { id: homeSectionId }
    });

    if (!homeSection) {
      throw new NotFoundException(`Home section with ID ${homeSectionId} not found`);
    }

    if (homeSection.type !== SectionType.BANNER) {
      throw new BadRequestException(`Banner items can only be added to sections of type BANNER`);
    }

    // Validate link type and required fields
    this.validateLinkFields(createBannerItemDto);

    // Get the highest order value to place new banner item at the end
    const highestOrder = await this.getHighestOrder(homeSectionId);

    // Set a placeholder image URL if not provided
    const imageUrl = createBannerItemDto.imageUrl || 'placeholder.jpg';

    return this.prisma.bannerItem.create({
      data: {
        ...createBannerItemDto,
        imageUrl,
        homeSectionId,
        order: createBannerItemDto.order ?? highestOrder + 1
      }
    });
  }

  // Get all banner items for a home section
  async findAll(homeSectionId: string, includeInactive = false): Promise<BannerItem[]> {
    // Check if the home section exists
    const homeSection = await this.prisma.homeSection.findUnique({
      where: { id: homeSectionId }
    });

    if (!homeSection) {
      throw new NotFoundException(`Home section with ID ${homeSectionId} not found`);
    }

    const where = {
      homeSectionId,
      ...(includeInactive ? {} : { isActive: true })
    };

    return this.prisma.bannerItem.findMany({
      where,
      orderBy: {
        order: 'asc'
      }
    });
  }

  // Get a specific banner item by ID
  async findOne(id: string): Promise<BannerItem> {
    const bannerItem = await this.prisma.bannerItem.findUnique({
      where: { id }
    });

    if (!bannerItem) {
      throw new NotFoundException(`Banner item with ID ${id} not found`);
    }

    return bannerItem;
  }

  // Update a banner item
  async update(id: string, updateBannerItemDto: UpdateBannerItemDto): Promise<BannerItem> {
    // Check if banner item exists
    const existingItem = await this.findOne(id);

    // Validate link type and required fields if they're being updated
    if (updateBannerItemDto.linkType ||
        updateBannerItemDto.linkId !== undefined ||
        updateBannerItemDto.externalUrl !== undefined) {

      this.validateLinkFields({
        linkType: updateBannerItemDto.linkType || existingItem.linkType as LinkType,
        linkId: updateBannerItemDto.linkId !== undefined ? updateBannerItemDto.linkId : existingItem.linkId,
        externalUrl: updateBannerItemDto.externalUrl !== undefined ? updateBannerItemDto.externalUrl : existingItem.externalUrl
      });
    }

    return this.prisma.bannerItem.update({
      where: { id },
      data: updateBannerItemDto
    });
  }

  // Delete a banner item
  async remove(id: string): Promise<BannerItem> {
    // Check if banner item exists
    await this.findOne(id);

    return this.prisma.bannerItem.delete({
      where: { id }
    });
  }

  // Reorder banner items within a section
  async reorder(homeSectionId: string, reorderDto: ReorderBannerItemsDto): Promise<BannerItem[]> {
    // Check if the home section exists
    const homeSection = await this.prisma.homeSection.findUnique({
      where: { id: homeSectionId }
    });

    if (!homeSection) {
      throw new NotFoundException(`Home section with ID ${homeSectionId} not found`);
    }

    // Validate that all banner item IDs exist and belong to this section
    const existingItems = await this.prisma.bannerItem.findMany({
      where: {
        id: {
          in: reorderDto.bannerItemIds
        },
        homeSectionId
      }
    });

    if (existingItems.length !== reorderDto.bannerItemIds.length) {
      throw new NotFoundException('One or more banner item IDs not found or do not belong to this section');
    }

    // Update order for each banner item
    const updatePromises = reorderDto.bannerItemIds.map((id, index) => {
      return this.prisma.bannerItem.update({
        where: { id },
        data: { order: index }
      });
    });

    await Promise.all(updatePromises);

    // Return the updated banner items in order
    return this.findAll(homeSectionId, true);
  }

  // Helper method to validate link fields
  private validateLinkFields(dto: { linkType?: LinkType; linkId?: string | null; externalUrl?: string | null }): void {
    if (dto.linkType === LinkType.EXTERNAL && !dto.externalUrl) {
      throw new BadRequestException('externalUrl is required when linkType is EXTERNAL');
    }

    if ((dto.linkType === LinkType.SONG ||
         dto.linkType === LinkType.ARTIST ||
         dto.linkType === LinkType.COLLECTION) &&
        !dto.linkId) {
      throw new BadRequestException(`linkId is required when linkType is ${dto.linkType}`);
    }
  }

  // Helper method to get the highest order value
  private async getHighestOrder(homeSectionId: string): Promise<number> {
    const highestOrderItem = await this.prisma.bannerItem.findFirst({
      where: { homeSectionId },
      orderBy: {
        order: 'desc'
      }
    });

    return highestOrderItem?.order ?? -1;
  }
}
