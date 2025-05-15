import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateBannerItemDto, UpdateBannerItemDto, ReorderBannerItemsDto, LinkType } from '../dto/banner-item.dto';
import { BannerItem, SectionType, Prisma } from '@prisma/client';

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

    // Make sure imageUrl is included (required by Prisma schema)
    if (!createBannerItemDto.imageUrl) {
      throw new BadRequestException('imageUrl is required for banner items');
    }

    // Prepare data with normalized values
    const createData: Prisma.BannerItemCreateInput = {
      title,
      linkType: linkType as string,
      order: createBannerItemDto.order ?? highestOrder + 1,
      imageUrl: createBannerItemDto.imageUrl,
      description: createBannerItemDto.description,
      isActive: createBannerItemDto.isActive ?? true,
      homeSection: {
        connect: {
          id: homeSectionId
        }
      }
    };

    // Only include linkId if it's needed for the current linkType
    if (linkType !== LinkType.SONG &&
        linkType !== LinkType.ARTIST &&
        linkType !== LinkType.COLLECTION) {
      createData.linkId = null;
    } else {
      createData.linkId = createBannerItemDto.linkId;
    }

    // Include externalUrl if provided
    if (createBannerItemDto.externalUrl) {
      createData.externalUrl = createBannerItemDto.externalUrl;
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
    let updateData: Prisma.BannerItemUpdateInput = { ...updateBannerItemDto };

    if (updateData.linkType) {
      if (typeof updateData.linkType === 'string') {
        updateData.linkType = (updateData.linkType as string).toLowerCase();
      }

      // If changing to a type that doesn't need linkId, clear it
      const linkTypeValue = updateData.linkType as string;
      if (linkTypeValue !== LinkType.SONG &&
          linkTypeValue !== LinkType.ARTIST &&
          linkTypeValue !== LinkType.COLLECTION) {
        updateData.linkId = null;
      }
    }

    // Validate link type and required fields if they're being updated
    if (updateData.linkType ||
        updateData.linkId !== undefined ||
        updateData.externalUrl !== undefined) {

      // Extract the actual values for validation
      const linkTypeValue = typeof updateData.linkType === 'string'
        ? updateData.linkType
        : existingItem.linkType as string;

      const linkIdValue = updateData.linkId !== undefined
        ? (typeof updateData.linkId === 'string' ? updateData.linkId : null)
        : existingItem.linkId;

      const externalUrlValue = updateData.externalUrl !== undefined
        ? (typeof updateData.externalUrl === 'string' ? updateData.externalUrl : null)
        : existingItem.externalUrl;

      this.validateLinkFields({
        linkType: linkTypeValue as LinkType,
        linkId: linkIdValue,
        externalUrl: externalUrlValue
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
