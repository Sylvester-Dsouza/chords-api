import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateArtistDto, UpdateArtistDto, ArtistResponseDto } from '../dto/artist.dto';

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArtistDto: CreateArtistDto): Promise<ArtistResponseDto> {
    // Check if artist with the same name already exists
    const existingArtist = await this.prisma.artist.findUnique({
      where: { name: createArtistDto.name },
    });

    if (existingArtist) {
      throw new ConflictException(`Artist with name '${createArtistDto.name}' already exists`);
    }

    // Prepare data for Prisma (convert SocialLinks to plain object)
    const data = {
      name: createArtistDto.name,
      bio: createArtistDto.bio,
      imageUrl: createArtistDto.imageUrl,
      website: createArtistDto.website,
      isFeatured: createArtistDto.isFeatured,
      socialLinks: createArtistDto.socialLinks ? JSON.parse(JSON.stringify(createArtistDto.socialLinks)) : undefined
    };

    // Create the artist
    const artist = await this.prisma.artist.create({
      data,
    });

    return artist;
  }

  async findAll(search?: string): Promise<ArtistResponseDto[]> {
    if (search) {
      return this.prisma.artist.findMany({
        where: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    return this.prisma.artist.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string): Promise<ArtistResponseDto> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        songs: true,
      },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return artist;
  }

  async update(id: string, updateArtistDto: UpdateArtistDto): Promise<ArtistResponseDto> {
    // Check if artist exists
    await this.findOne(id);

    // If name is being updated, check if it conflicts with another artist
    if (updateArtistDto.name) {
      const existingArtist = await this.prisma.artist.findUnique({
        where: { name: updateArtistDto.name },
      });

      if (existingArtist && existingArtist.id !== id) {
        throw new ConflictException(`Artist with name '${updateArtistDto.name}' already exists`);
      }
    }

    // Prepare data for Prisma (convert SocialLinks to plain object)
    const data: any = {};
    if (updateArtistDto.name !== undefined) data.name = updateArtistDto.name;
    if (updateArtistDto.bio !== undefined) data.bio = updateArtistDto.bio;
    if (updateArtistDto.imageUrl !== undefined) data.imageUrl = updateArtistDto.imageUrl;
    if (updateArtistDto.website !== undefined) data.website = updateArtistDto.website;
    if (updateArtistDto.isFeatured !== undefined) data.isFeatured = updateArtistDto.isFeatured;
    if (updateArtistDto.socialLinks !== undefined) {
      data.socialLinks = updateArtistDto.socialLinks ? JSON.parse(JSON.stringify(updateArtistDto.socialLinks)) : null;
    }

    // Update artist
    const updatedArtist = await this.prisma.artist.update({
      where: { id },
      data,
    });

    return updatedArtist;
  }

  async remove(id: string): Promise<ArtistResponseDto> {
    // Check if artist exists
    await this.findOne(id);

    // Delete artist
    const deletedArtist = await this.prisma.artist.delete({
      where: { id },
    });

    return deletedArtist;
  }
}
