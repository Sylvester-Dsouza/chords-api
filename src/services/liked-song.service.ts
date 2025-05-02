import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { LikedSongResponseDto } from '../dto/liked-song.dto';
import { SongResponseDto } from '../dto/song.dto';
import { LikedSong } from '@prisma/client';

@Injectable()
export class LikedSongService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCustomer(customerId: string): Promise<SongResponseDto[]> {
    const likedSongs = await this.prisma.likedSong.findMany({
      where: {
        customerId,
      },
      include: {
        song: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return the songs, not the liked song records
    return likedSongs.map(likedSong => likedSong.song);
  }

  async likeSong(customerId: string, songId: string): Promise<LikedSongResponseDto> {
    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is already liked
    const existingLike = await this.prisma.likedSong.findUnique({
      where: {
        customerId_songId: {
          customerId,
          songId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException(`Song with ID ${songId} is already liked`);
    }

    // Create liked song record
    const likedSong = await this.prisma.likedSong.create({
      data: {
        customer: {
          connect: { id: customerId },
        },
        song: {
          connect: { id: songId },
        },
      },
      include: {
        song: {
          include: {
            artist: true,
          },
        },
      },
    });

    return likedSong;
  }

  async unlikeSong(customerId: string, songId: string): Promise<LikedSongResponseDto> {
    // Check if liked song record exists
    const likedSong = await this.prisma.likedSong.findUnique({
      where: {
        customerId_songId: {
          customerId,
          songId,
        },
      },
      include: {
        song: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!likedSong) {
      throw new NotFoundException(`Liked song record not found`);
    }

    // Delete liked song record
    await this.prisma.likedSong.delete({
      where: {
        customerId_songId: {
          customerId,
          songId,
        },
      },
    });

    return likedSong;
  }

  async isLiked(customerId: string, songId: string): Promise<boolean> {
    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is liked
    const likedSong = await this.prisma.likedSong.findUnique({
      where: {
        customerId_songId: {
          customerId,
          songId,
        },
      },
    });

    return !!likedSong;
  }
}
