import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto, SongTagDto, ArtistTagDto, CollectionTagDto } from '../dto/tag.dto';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto): Promise<TagResponseDto> {
    try {
      // Check if tag with the same name already exists
      const existingTag = await this.prisma.tag.findUnique({
        where: { name: createTagDto.name },
      });

      if (existingTag) {
        throw new BadRequestException(`Tag with name '${createTagDto.name}' already exists`);
      }

      // Create the tag
      const tag = await this.prisma.tag.create({
        data: {
          name: createTagDto.name,
          description: createTagDto.description,
          color: createTagDto.color,
          forSongs: createTagDto.forSongs,
          forArtists: createTagDto.forArtists,
          forCollections: createTagDto.forCollections,
        },
      });

      // Convert null to undefined for nullable fields
      return {
        ...tag,
        description: tag.description || undefined,
        color: tag.color || undefined,
        forSongs: tag.forSongs,
        forArtists: tag.forArtists,
        forCollections: tag.forCollections,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to create tag: ${errorMessage}`);
    }
  }

  async findAll(search?: string): Promise<TagResponseDto[]> {
    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }
      : {};

    const tags = await this.prisma.tag.findMany({
      where: where as any, // Type assertion to fix Prisma query filter issue
      orderBy: {
        name: 'asc',
      },
    });

    // Convert null to undefined for nullable fields
    return tags.map(tag => ({
      ...tag,
      description: tag.description || undefined,
      color: tag.color || undefined,
      forSongs: tag.forSongs,
      forArtists: tag.forArtists,
      forCollections: tag.forCollections,
    }));
  }

  async findOne(id: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Convert null to undefined for nullable fields
    return {
      ...tag,
      description: tag.description || undefined,
      color: tag.color || undefined,
      forSongs: tag.forSongs,
      forArtists: tag.forArtists,
      forCollections: tag.forCollections,
    };
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<TagResponseDto> {
    try {
      // Check if tag exists
      const existingTag = await this.prisma.tag.findUnique({
        where: { id },
      });

      if (!existingTag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }

      // If name is being updated, check if it's unique
      if (updateTagDto.name && updateTagDto.name !== existingTag.name) {
        const tagWithSameName = await this.prisma.tag.findUnique({
          where: { name: updateTagDto.name },
        });

        if (tagWithSameName) {
          throw new BadRequestException(`Tag with name '${updateTagDto.name}' already exists`);
        }
      }

      // Update the tag
      const updatedTag = await this.prisma.tag.update({
        where: { id },
        data: {
          name: updateTagDto.name,
          description: updateTagDto.description,
          color: updateTagDto.color,
          forSongs: updateTagDto.forSongs,
          forArtists: updateTagDto.forArtists,
          forCollections: updateTagDto.forCollections,
        },
      });

      // Convert null to undefined for nullable fields
      return {
        ...updatedTag,
        description: updatedTag.description || undefined,
        color: updatedTag.color || undefined,
        forSongs: updatedTag.forSongs,
        forArtists: updatedTag.forArtists,
        forCollections: updatedTag.forCollections,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to update tag: ${errorMessage}`);
    }
  }

  async remove(id: string): Promise<TagResponseDto> {
    try {
      // Check if tag exists
      const existingTag = await this.prisma.tag.findUnique({
        where: { id },
      });

      if (!existingTag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }

      // Delete the tag
      const deletedTag = await this.prisma.tag.delete({
        where: { id },
      });

      // Convert null to undefined for nullable fields
      return {
        ...deletedTag,
        description: deletedTag.description || undefined,
        color: deletedTag.color || undefined,
        forSongs: deletedTag.forSongs,
        forArtists: deletedTag.forArtists,
        forCollections: deletedTag.forCollections,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete tag: ${errorMessage}`);
    }
  }

  async addTagToSong(songTagDto: SongTagDto): Promise<void> {
    try {
      // Check if song exists
      const song = await this.prisma.song.findUnique({
        where: { id: songTagDto.songId },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${songTagDto.songId} not found`);
      }

      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: songTagDto.tagId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${songTagDto.tagId} not found`);
      }

      // Check if the relationship already exists
      const existingRelation = await this.prisma.songTag.findUnique({
        where: {
          songId_tagId: {
            songId: songTagDto.songId,
            tagId: songTagDto.tagId,
          },
        },
      });

      if (existingRelation) {
        // If the relationship already exists, we don't need to do anything
        return;
      }

      // Create the relationship
      await this.prisma.songTag.create({
        data: {
          songId: songTagDto.songId,
          tagId: songTagDto.tagId,
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to add tag to song: ${errorMessage}`);
    }
  }

  async removeTagFromSong(songTagDto: SongTagDto): Promise<void> {
    try {
      // Check if the relationship exists
      const existingRelation = await this.prisma.songTag.findUnique({
        where: {
          songId_tagId: {
            songId: songTagDto.songId,
            tagId: songTagDto.tagId,
          },
        },
      });

      if (!existingRelation) {
        throw new NotFoundException(`Relationship between song ${songTagDto.songId} and tag ${songTagDto.tagId} not found`);
      }

      // Delete the relationship
      await this.prisma.songTag.delete({
        where: {
          songId_tagId: {
            songId: songTagDto.songId,
            tagId: songTagDto.tagId,
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to remove tag from song: ${errorMessage}`);
    }
  }

  async getSongTags(songId: string): Promise<TagResponseDto[]> {
    try {
      // Check if song exists
      const song = await this.prisma.song.findUnique({
        where: { id: songId },
      });

      if (!song) {
        throw new NotFoundException(`Song with ID ${songId} not found`);
      }

      // Get all tags for the song
      const songTags = await this.prisma.songTag.findMany({
        where: { songId },
        include: { tag: true },
      });

      // Convert null to undefined for nullable fields
      return songTags.map(songTag => ({
        ...songTag.tag,
        description: songTag.tag.description || undefined,
        color: songTag.tag.color || undefined,
        forSongs: songTag.tag.forSongs,
        forArtists: songTag.tag.forArtists,
        forCollections: songTag.tag.forCollections,
      }));
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get song tags: ${errorMessage}`);
    }
  }

  async getTagSongs(tagId: string): Promise<string[]> {
    try {
      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${tagId} not found`);
      }

      // Get all songs for the tag
      const tagSongs = await this.prisma.songTag.findMany({
        where: { tagId },
        select: { songId: true },
      });

      return tagSongs.map(tagSong => tagSong.songId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get tag songs: ${errorMessage}`);
    }
  }

  // Artist tag methods
  async addTagToArtist(artistTagDto: ArtistTagDto): Promise<void> {
    try {
      // Check if artist exists
      const artist = await this.prisma.artist.findUnique({
        where: { id: artistTagDto.artistId },
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID ${artistTagDto.artistId} not found`);
      }

      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: artistTagDto.tagId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${artistTagDto.tagId} not found`);
      }

      // Check if the relationship already exists
      const existingRelation = await this.prisma.artistTag.findUnique({
        where: {
          artistId_tagId: {
            artistId: artistTagDto.artistId,
            tagId: artistTagDto.tagId,
          },
        },
      });

      if (existingRelation) {
        // If the relationship already exists, we don't need to do anything
        return;
      }

      // Create the relationship
      await this.prisma.artistTag.create({
        data: {
          artistId: artistTagDto.artistId,
          tagId: artistTagDto.tagId,
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to add tag to artist: ${errorMessage}`);
    }
  }

  async removeTagFromArtist(artistTagDto: ArtistTagDto): Promise<void> {
    try {
      // Check if the relationship exists
      const existingRelation = await this.prisma.artistTag.findUnique({
        where: {
          artistId_tagId: {
            artistId: artistTagDto.artistId,
            tagId: artistTagDto.tagId,
          },
        },
      });

      if (!existingRelation) {
        throw new NotFoundException(`Relationship between artist ${artistTagDto.artistId} and tag ${artistTagDto.tagId} not found`);
      }

      // Delete the relationship
      await this.prisma.artistTag.delete({
        where: {
          artistId_tagId: {
            artistId: artistTagDto.artistId,
            tagId: artistTagDto.tagId,
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to remove tag from artist: ${errorMessage}`);
    }
  }

  async getArtistTags(artistId: string): Promise<TagResponseDto[]> {
    try {
      // Check if artist exists
      const artist = await this.prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID ${artistId} not found`);
      }

      // Get all tags for the artist
      const artistTags = await this.prisma.artistTag.findMany({
        where: { artistId },
        include: { tag: true },
      });

      // Convert null to undefined for nullable fields
      return artistTags.map(artistTag => ({
        ...artistTag.tag,
        description: artistTag.tag.description || undefined,
        color: artistTag.tag.color || undefined,
        forSongs: artistTag.tag.forSongs,
        forArtists: artistTag.tag.forArtists,
        forCollections: artistTag.tag.forCollections,
      }));
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get artist tags: ${errorMessage}`);
    }
  }

  async getTagArtists(tagId: string): Promise<string[]> {
    try {
      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${tagId} not found`);
      }

      // Get all artists for the tag
      const tagArtists = await this.prisma.artistTag.findMany({
        where: { tagId },
        select: { artistId: true },
      });

      return tagArtists.map(tagArtist => tagArtist.artistId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get tag artists: ${errorMessage}`);
    }
  }

  // Collection tag methods
  async addTagToCollection(collectionTagDto: CollectionTagDto): Promise<void> {
    try {
      // Check if collection exists
      const collection = await this.prisma.collection.findUnique({
        where: { id: collectionTagDto.collectionId },
      });

      if (!collection) {
        throw new NotFoundException(`Collection with ID ${collectionTagDto.collectionId} not found`);
      }

      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: collectionTagDto.tagId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${collectionTagDto.tagId} not found`);
      }

      // Check if the relationship already exists
      const existingRelation = await this.prisma.collectionTag.findUnique({
        where: {
          collectionId_tagId: {
            collectionId: collectionTagDto.collectionId,
            tagId: collectionTagDto.tagId,
          },
        },
      });

      if (existingRelation) {
        // If the relationship already exists, we don't need to do anything
        return;
      }

      // Create the relationship
      await this.prisma.collectionTag.create({
        data: {
          collectionId: collectionTagDto.collectionId,
          tagId: collectionTagDto.tagId,
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to add tag to collection: ${errorMessage}`);
    }
  }

  async removeTagFromCollection(collectionTagDto: CollectionTagDto): Promise<void> {
    try {
      // Check if the relationship exists
      const existingRelation = await this.prisma.collectionTag.findUnique({
        where: {
          collectionId_tagId: {
            collectionId: collectionTagDto.collectionId,
            tagId: collectionTagDto.tagId,
          },
        },
      });

      if (!existingRelation) {
        throw new NotFoundException(`Relationship between collection ${collectionTagDto.collectionId} and tag ${collectionTagDto.tagId} not found`);
      }

      // Delete the relationship
      await this.prisma.collectionTag.delete({
        where: {
          collectionId_tagId: {
            collectionId: collectionTagDto.collectionId,
            tagId: collectionTagDto.tagId,
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to remove tag from collection: ${errorMessage}`);
    }
  }

  async getCollectionTags(collectionId: string): Promise<TagResponseDto[]> {
    try {
      // Check if collection exists
      const collection = await this.prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (!collection) {
        throw new NotFoundException(`Collection with ID ${collectionId} not found`);
      }

      // Get all tags for the collection
      const collectionTags = await this.prisma.collectionTag.findMany({
        where: { collectionId },
        include: { tag: true },
      });

      // Convert null to undefined for nullable fields
      return collectionTags.map(collectionTag => ({
        ...collectionTag.tag,
        description: collectionTag.tag.description || undefined,
        color: collectionTag.tag.color || undefined,
        forSongs: collectionTag.tag.forSongs,
        forArtists: collectionTag.tag.forArtists,
        forCollections: collectionTag.tag.forCollections,
      }));
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get collection tags: ${errorMessage}`);
    }
  }

  async getTagCollections(tagId: string): Promise<string[]> {
    try {
      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${tagId} not found`);
      }

      // Get all collections for the tag
      const tagCollections = await this.prisma.collectionTag.findMany({
        where: { tagId },
        select: { collectionId: true },
      });

      return tagCollections.map(tagCollection => tagCollection.collectionId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get tag collections: ${errorMessage}`);
    }
  }
}
