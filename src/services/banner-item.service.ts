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

    // Set default values for optional fields
    const title = createBannerItemDto.title || 'Banner Item';

    // Normalize linkType to lowercase for consistency
    let linkType = createBannerItemDto.linkType || LinkType.NONE;
    if (typeof linkType === 'string') {
      linkType = linkType.toLowerCase() as LinkType;
    }

    // Prepare data with normalized values
    const createData = {
      ...createBannerItemDto,
      title,
      linkType,
      homeSectionId,
      order: createBannerItemDto.order ?? highestOrder + 1
    };

    // Only include linkId if it's needed for the current linkType
    if (linkType !== LinkType.SONG &&
        linkType !== LinkType.ARTIST &&
        linkType !== LinkType.COLLECTION) {
      createData.linkId = null;
    }

    return this.prisma.bannerItem.create({
      data: createData
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

    // Normalize linkType to lowercase for consistency
    let updateData = { ...updateBannerItemDto };

    if (updateData.linkType) {
      if (typeof updateData.linkType === 'string') {
        updateData.linkType = updateData.linkType.toLowerCase() as LinkType;
      }

      // If changing to a type that doesn't need linkId, clear it
      if (updateData.linkType !== LinkType.SONG &&
          updateData.linkType !== LinkType.ARTIST &&
          updateData.linkType !== LinkType.COLLECTION) {
        updateData.linkId = null;
      }
    }

    // Validate link type and required fields if they're being updated
    if (updateData.linkType ||
        updateData.linkId !== undefined ||
        updateData.externalUrl !== undefined) {

      this.validateLinkFields({
        linkType: updateData.linkType || existingItem.linkType as LinkType,
        linkId: updateData.linkId !== undefined ? updateData.linkId : existingItem.linkId,
        externalUrl: updateData.externalUrl !== undefined ? updateData.externalUrl : existingItem.externalUrl
      });
    }

    return this.prisma.bannerItem.update({
      where: { id },
      data: updateData
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
  private validateLinkFields(dto: { linkType?: LinkType | string; linkId?: string | null; externalUrl?: string | null }): void {
    // If linkType is not provided, skip validation
    if (!dto.linkType) {
      return;
    }

    // Normalize linkType to lowercase for case-insensitive comparison
    const normalizedLinkType = typeof dto.linkType === 'string' ? dto.linkType.toLowerCase() : dto.linkType;

    if (normalizedLinkType === LinkType.EXTERNAL.toLowerCase() && !dto.externalUrl) {
      throw new BadRequestException('externalUrl is required when linkType is EXTERNAL');
    }

    if ((normalizedLinkType === LinkType.SONG.toLowerCase() ||
         normalizedLinkType === LinkType.ARTIST.toLowerCase() ||
         normalizedLinkType === LinkType.COLLECTION.toLowerCase()) &&
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
