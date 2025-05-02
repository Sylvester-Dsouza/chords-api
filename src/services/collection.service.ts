import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateCollectionDto, UpdateCollectionDto, CollectionResponseDto } from '../dto/collection.dto';

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCollectionDto: CreateCollectionDto): Promise<CollectionResponseDto> {
    // Create the collection
    const collection = await this.prisma.collection.create({
      data: {
        name: createCollectionDto.name,
        description: createCollectionDto.description,
        imageUrl: createCollectionDto.imageUrl,
        isPublic: createCollectionDto.isPublic ?? true,
      },
      include: {
        songs: true,
      },
    });

    return collection;
  }

  async findAll(search?: string): Promise<CollectionResponseDto[]> {
    const where: any = {
      isPublic: true,
    };

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.collection.findMany({
      where,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string): Promise<CollectionResponseDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    return collection;
  }

  async update(id: string, updateCollectionDto: UpdateCollectionDto): Promise<CollectionResponseDto> {
    // Check if collection exists
    await this.findOne(id);

    // Update collection
    const updatedCollection = await this.prisma.collection.update({
      where: { id },
      data: updateCollectionDto,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedCollection;
  }

  async addSong(collectionId: string, songId: string): Promise<CollectionResponseDto> {
    // Check if collection exists
    const collection = await this.findOne(collectionId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is already in the collection
    const songs = collection.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (songExists) {
      throw new BadRequestException(`Song with ID ${songId} is already in the collection`);
    }

    // Add song to collection
    const updatedCollection = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        songs: {
          connect: { id: songId },
        },
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedCollection;
  }

  async removeSong(collectionId: string, songId: string): Promise<CollectionResponseDto> {
    // Check if collection exists
    const collection = await this.findOne(collectionId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is in the collection
    const songs = collection.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (!songExists) {
      throw new BadRequestException(`Song with ID ${songId} is not in the collection`);
    }

    // Remove song from collection
    const updatedCollection = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        songs: {
          disconnect: { id: songId },
        },
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedCollection;
  }

  async remove(id: string): Promise<CollectionResponseDto> {
    // Check if collection exists
    await this.findOne(id);

    // Delete collection
    const deletedCollection = await this.prisma.collection.delete({
      where: { id },
      include: {
        songs: true,
      },
    });

    return deletedCollection;
  }
}
