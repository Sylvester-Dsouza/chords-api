import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateSetlistDto, UpdateSetlistDto, SetlistResponseDto } from '../dto/setlist.dto';

@Injectable()
export class SetlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, createSetlistDto: CreateSetlistDto): Promise<SetlistResponseDto> {
    // Create the setlist
    const setlist = await this.prisma.setlist.create({
      data: {
        name: createSetlistDto.name,
        description: createSetlistDto.description,
        customer: {
          connect: { id: customerId },
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

    return setlist;
  }

  async findAllByCustomer(customerId: string): Promise<SetlistResponseDto[]> {
    return this.prisma.setlist.findMany({
      where: {
        customerId,
      },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: string, customerId: string): Promise<SetlistResponseDto> {
    const setlist = await this.prisma.setlist.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!setlist) {
      throw new NotFoundException(`Setlist with ID ${id} not found`);
    }

    // Check if the setlist belongs to the customer
    if (setlist.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to access this setlist');
    }

    return setlist;
  }

  async update(id: string, customerId: string, updateSetlistDto: UpdateSetlistDto): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Update setlist
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id },
      data: updateSetlistDto,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedSetlist;
  }

  async addSong(setlistId: string, customerId: string, songId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    const setlist = await this.findOne(setlistId, customerId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is already in the setlist
    const songs = setlist.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (songExists) {
      throw new BadRequestException(`Song with ID ${songId} is already in the setlist`);
    }

    // Add song to setlist
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
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

    return updatedSetlist;
  }

  async removeSong(setlistId: string, customerId: string, songId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    const setlist = await this.findOne(setlistId, customerId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is in the setlist
    const songs = setlist.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (!songExists) {
      throw new BadRequestException(`Song with ID ${songId} is not in the setlist`);
    }

    // Remove song from setlist
    const updatedSetlist = await this.prisma.setlist.update({
      where: { id: setlistId },
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

    return updatedSetlist;
  }

  async remove(id: string, customerId: string): Promise<SetlistResponseDto> {
    // Check if setlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Delete setlist
    const deletedSetlist = await this.prisma.setlist.delete({
      where: { id },
      include: {
        songs: true,
      },
    });

    return deletedSetlist;
  }
}
