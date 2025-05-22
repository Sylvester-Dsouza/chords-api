import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateHomeSectionDto, UpdateHomeSectionDto, ReorderHomeSectionsDto } from '../dto/home-section.dto';
import { HomeSection, SectionType } from '@prisma/client';

@Injectable()
export class HomeSectionService {
  constructor(private prisma: PrismaService) {}

  // Create a new home section
  async create(createHomeSectionDto: CreateHomeSectionDto): Promise<HomeSection> {
    console.log('Service: Creating home section with data:', JSON.stringify(createHomeSectionDto, null, 2));

    try {
      // Get the highest order value to place new section at the end
      const highestOrder = await this.getHighestOrder();
      console.log('Service: Highest order:', highestOrder);

      // For banner sections, ensure we have the right defaults
      const data = { ...createHomeSectionDto };
      console.log('Service: Section type:', data.type);

      // Set default values based on section type
      if (data.type === SectionType.BANNER) {
        console.log('Service: Setting defaults for BANNER type');
        // For banner sections, itemCount is not relevant, but we need to set a default
        data.itemCount = data.itemCount || 0;
        // Filter type is not used for banner sections
        data.filterType = undefined;
        // Initialize itemIds as empty array if not provided
        data.itemIds = data.itemIds || [];
      } else {
        console.log('Service: Setting defaults for non-BANNER type');
        // For other section types, set default itemCount if not provided
        data.itemCount = data.itemCount || 10;
        // Initialize itemIds as empty array if not provided
        data.itemIds = data.itemIds || [];
      }

      console.log('Service: Processed data:', JSON.stringify(data, null, 2));

      // Prepare the create data object
      const createData = {
        ...data,
        order: data.order ?? highestOrder + 1,
        bannerItems: data.type === SectionType.BANNER && data.bannerItems ? {
          create: data.bannerItems.map((item, index) => ({
            ...item,
            title: item.title || 'Banner Item', // Set a default title if not provided
            imageUrl: item.imageUrl || 'placeholder.jpg', // Set a placeholder image URL if not provided
            linkType: item.linkType || 'none', // Set a default linkType if not provided
            order: item.order ?? index
          }))
        } : undefined
      };

      console.log('Service: Final create data:', JSON.stringify(createData, null, 2));

      const result = await this.prisma.homeSection.create({
        data: createData,
        include: {
          bannerItems: true
        }
      });

      console.log('Service: Home section created successfully');
      return result;
    } catch (error: any) {
      console.error('Service: Error creating home section:', error.message || 'Unknown error');
      if (error.meta) {
        console.error('Service: Error meta:', error.meta);
      }
      throw error;
    }
  }

  // Get all home sections
  async findAll(includeInactive = false): Promise<HomeSection[]> {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.homeSection.findMany({
      where,
      orderBy: {
        order: 'asc'
      },
      include: {
        bannerItems: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
  }

  // Get a specific home section by ID
  async findOne(id: string): Promise<HomeSection> {
    const section = await this.prisma.homeSection.findUnique({
      where: { id },
      include: {
        bannerItems: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!section) {
      throw new NotFoundException(`Home section with ID ${id} not found`);
    }

    return section;
  }

  // Update a home section
  async update(id: string, updateHomeSectionDto: UpdateHomeSectionDto): Promise<HomeSection> {
    // Check if section exists
    const existingSection = await this.findOne(id);

    // Create a copy of the update data
    const data = { ...updateHomeSectionDto };

    // If changing to banner type or already a banner type
    if (data.type === SectionType.BANNER || existingSection.type === SectionType.BANNER) {
      // For banner sections, ensure we have the right defaults
      if (data.type === SectionType.BANNER) {
        // For banner sections, itemCount is not relevant, but we need to set a default
        data.itemCount = data.itemCount || 0;
        // Filter type is not used for banner sections
        data.filterType = undefined;
      }
    }

    // IMPORTANT: Only update itemIds if explicitly provided in the request
    // Otherwise, preserve the existing itemIds
    if (!data.itemIds) {
      // Remove itemIds from the update data to prevent overwriting
      delete data.itemIds;
    }

    console.log(`Updating section ${id} with data:`, JSON.stringify(data, null, 2));

    // Update the section with the provided data
    const updatedSection = await this.prisma.homeSection.update({
      where: { id },
      data,
      include: {
        bannerItems: true
      }
    });

    // If itemIds wasn't in the update data, make sure it's included in the response
    if (!data.itemIds && !updatedSection.itemIds) {
      // Fetch the complete section to ensure we have itemIds
      const completeSection = await this.findOne(id);
      updatedSection.itemIds = completeSection.itemIds;
    }

    return updatedSection;
  }

  // Delete a home section
  async remove(id: string): Promise<HomeSection> {
    // Check if section exists
    await this.findOne(id);

    return this.prisma.homeSection.delete({
      where: { id },
      include: {
        bannerItems: true
      }
    });
  }

  // Reorder home sections
  async reorder(reorderDto: ReorderHomeSectionsDto): Promise<HomeSection[]> {
    // Validate that all section IDs exist
    const existingSections = await this.prisma.homeSection.findMany({
      where: {
        id: {
          in: reorderDto.sectionIds
        }
      },
      include: {
        bannerItems: true
      }
    });

    if (existingSections.length !== reorderDto.sectionIds.length) {
      throw new NotFoundException('One or more section IDs not found');
    }

    // Create a map of existing sections for quick lookup
    const sectionsMap = new Map(
      existingSections.map(section => [section.id, section])
    );

    // Update order for each section while preserving other data
    const updatePromises = reorderDto.sectionIds.map((id, index) => {
      const existingSection = sectionsMap.get(id);

      // Only update the order field, preserving all other data
      return this.prisma.homeSection.update({
        where: { id },
        data: { order: index },
        include: {
          bannerItems: true
        }
      });
    });

    const updatedSections = await Promise.all(updatePromises);

    // Return the updated sections in order
    return this.findAll(true);
  }

  // Get home sections for the mobile app (only active sections)
  async getHomeSectionsForApp(): Promise<any[]> {
    const sections = await this.findAll(false);

    // Process each section to include the actual content items
    const processedSections = await Promise.all(
      sections.map(async (section) => {
        let items = [];

        // Get the appropriate items based on section type
        switch (section.type) {
          case SectionType.COLLECTIONS:
            items = await this.getCollectionsForSection(section);
            break;
          case SectionType.SONGS:
          case SectionType.SONG_LIST:
            // Both SONGS and SONG_LIST contain Song objects, just displayed differently
            items = await this.getSongsForSection(section);
            break;
          case SectionType.ARTISTS:
            items = await this.getArtistsForSection(section);
            break;
          case SectionType.BANNER:
            // For banner sections, get the banner items from the database
            const bannerItems = await this.prisma.bannerItem.findMany({
              where: {
                homeSectionId: section.id,
                isActive: true
              },
              orderBy: {
                order: 'asc'
              }
            });
            items = bannerItems;
            break;
        }

        return {
          id: section.id,
          title: section.title,
          type: section.type,
          items
        };
      })
    );

    return processedSections;
  }

  // Helper methods to get content for each section type
  private async getCollectionsForSection(section: HomeSection): Promise<any[]> {
    let collections;

    if (section.itemIds && section.itemIds.length > 0) {
      // Use specific collection IDs if provided
      collections = await this.prisma.collection.findMany({
        where: {
          id: { in: section.itemIds }
        },
        take: section.itemCount,
        include: {
          collectionTags: {
            include: {
              tag: true
            }
          }
        }
      });

      // Sort collections in the same order as itemIds
      collections.sort((a, b) => {
        return section.itemIds.indexOf(a.id) - section.itemIds.indexOf(b.id);
      });
    } else {
      // Apply filter based on filterType
      let where: any = {};

      if (section.filterType === 'seasonal') {
        where = {
          collectionTags: {
            some: {
              tag: {
                name: { contains: 'seasonal', mode: 'insensitive' }
              }
            }
          }
        };
      } else if (section.filterType === 'trending') {
        // For trending, we could sort by view count or some other metric
        // This is a placeholder implementation
      }

      collections = await this.prisma.collection.findMany({
        where,
        take: section.itemCount,
        orderBy: {
          createdAt: 'desc' // Default to newest
        },
        include: {
          collectionTags: {
            include: {
              tag: true
            }
          }
        }
      });
    }

    return collections;
  }

  private async getSongsForSection(section: HomeSection): Promise<any[]> {
    let songs;

    if (section.itemIds && section.itemIds.length > 0) {
      // Use specific song IDs if provided
      songs = await this.prisma.song.findMany({
        where: {
          id: { in: section.itemIds }
        },
        take: section.itemCount,
        include: {
          artist: true,
          songTags: {
            include: {
              tag: true
            }
          }
        }
      });

      // Sort songs in the same order as itemIds
      songs.sort((a, b) => {
        return section.itemIds.indexOf(a.id) - section.itemIds.indexOf(b.id);
      });
    } else {
      // Apply filter based on filterType
      let where: any = {};
      let orderBy: any = { createdAt: 'desc' }; // Default to newest

      if (section.filterType === 'trending') {
        orderBy = { viewCount: 'desc' };
      } else if (section.filterType === 'beginner') {
        where.difficulty = 'BEGINNER';
      }

      songs = await this.prisma.song.findMany({
        where,
        take: section.itemCount,
        orderBy,
        include: {
          artist: true,
          songTags: {
            include: {
              tag: true
            }
          }
        }
      });
    }

    return songs;
  }

  private async getArtistsForSection(section: HomeSection): Promise<any[]> {
    let artists;

    if (section.itemIds && section.itemIds.length > 0) {
      // Use specific artist IDs if provided
      artists = await this.prisma.artist.findMany({
        where: {
          id: { in: section.itemIds }
        },
        take: section.itemCount,
        include: {
          artistTags: {
            include: {
              tag: true
            }
          }
        }
      });

      // Sort artists in the same order as itemIds
      artists.sort((a, b) => {
        return section.itemIds.indexOf(a.id) - section.itemIds.indexOf(b.id);
      });
    } else {
      // Apply filter based on filterType
      let where: any = {};
      let orderBy: any = { createdAt: 'desc' }; // Default to newest

      if (section.filterType === 'popular') {
        // For popular, we could sort by song count or some other metric
        orderBy = {
          viewCount: 'desc'
        };
      }

      artists = await this.prisma.artist.findMany({
        where,
        take: section.itemCount,
        orderBy,
        include: {
          artistTags: {
            include: {
              tag: true
            }
          }
        }
      });
    }

    return artists;
  }

  // Get all items for a specific section by ID for the mobile app
  async getSectionItemsForApp(id: string): Promise<any[]> {
    // Find the section
    const section = await this.prisma.homeSection.findUnique({
      where: { id }
    });

    if (!section) {
      throw new NotFoundException(`Home section with ID ${id} not found`);
    }

    // Get the items based on section type
    switch (section.type) {
      case SectionType.COLLECTIONS:
        return this.getCollectionsForSection(section);
      case SectionType.SONGS:
        return this.getSongsForSection(section);
      case SectionType.SONG_LIST:
        // SONG_LIST uses the same data as SONGS, just displayed differently in the app
        return this.getSongsForSection(section);
      case SectionType.ARTISTS:
        return this.getArtistsForSection(section);
      case SectionType.BANNER:
        // For banner sections, get the banner items from the database
        return this.prisma.bannerItem.findMany({
          where: {
            homeSectionId: section.id,
            isActive: true
          },
          orderBy: {
            order: 'asc'
          }
        });
      default:
        return [];
    }
  }

  // Helper method to get the highest order value
  private async getHighestOrder(): Promise<number> {
    const highestOrderSection = await this.prisma.homeSection.findFirst({
      orderBy: {
        order: 'desc'
      }
    });

    return highestOrderSection?.order ?? -1;
  }
}
