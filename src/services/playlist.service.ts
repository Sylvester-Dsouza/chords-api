import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreatePlaylistDto, UpdatePlaylistDto, PlaylistResponseDto } from '../dto/playlist.dto';

@Injectable()
export class PlaylistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, createPlaylistDto: CreatePlaylistDto): Promise<PlaylistResponseDto> {
    // Create the playlist
    const playlist = await this.prisma.playlist.create({
      data: {
        name: createPlaylistDto.name,
        description: createPlaylistDto.description,
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

    return playlist;
  }

  async findAllByCustomer(customerId: string): Promise<PlaylistResponseDto[]> {
    return this.prisma.playlist.findMany({
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

  async findOne(id: string, customerId: string): Promise<PlaylistResponseDto> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }

    // Check if the playlist belongs to the customer
    if (playlist.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to access this playlist');
    }

    return playlist;
  }

  async update(id: string, customerId: string, updatePlaylistDto: UpdatePlaylistDto): Promise<PlaylistResponseDto> {
    // Check if playlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Update playlist
    const updatedPlaylist = await this.prisma.playlist.update({
      where: { id },
      data: updatePlaylistDto,
      include: {
        songs: {
          include: {
            artist: true,
          },
        },
      },
    });

    return updatedPlaylist;
  }

  async addSong(playlistId: string, customerId: string, songId: string): Promise<PlaylistResponseDto> {
    // Check if playlist exists and belongs to the customer
    const playlist = await this.findOne(playlistId, customerId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is already in the playlist
    const songs = playlist.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (songExists) {
      throw new BadRequestException(`Song with ID ${songId} is already in the playlist`);
    }

    // Add song to playlist
    const updatedPlaylist = await this.prisma.playlist.update({
      where: { id: playlistId },
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

    return updatedPlaylist;
  }

  async removeSong(playlistId: string, customerId: string, songId: string): Promise<PlaylistResponseDto> {
    // Check if playlist exists and belongs to the customer
    const playlist = await this.findOne(playlistId, customerId);

    // Check if song exists
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${songId} not found`);
    }

    // Check if song is in the playlist
    const songs = playlist.songs || [];
    const songExists = songs.some(s => s.id === songId);
    if (!songExists) {
      throw new BadRequestException(`Song with ID ${songId} is not in the playlist`);
    }

    // Remove song from playlist
    const updatedPlaylist = await this.prisma.playlist.update({
      where: { id: playlistId },
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

    return updatedPlaylist;
  }

  async remove(id: string, customerId: string): Promise<PlaylistResponseDto> {
    // Check if playlist exists and belongs to the customer
    await this.findOne(id, customerId);

    // Delete playlist
    const deletedPlaylist = await this.prisma.playlist.delete({
      where: { id },
      include: {
        songs: true,
      },
    });

    return deletedPlaylist;
  }
}
