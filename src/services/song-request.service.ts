import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateSongRequestDto, UpdateSongRequestDto, SongRequestResponseDto, SongRequestStatus, UpvoteSongRequestResponseDto } from '../dto/song-request.dto';
import { NotificationService } from './notification.service';

@Injectable()
export class SongRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Helper method to convert Prisma model to DTO
   * This converts null values to undefined for DTO compatibility
   */
  private mapSongRequestToDto(songRequest: any, hasUpvoted?: boolean): SongRequestResponseDto {
    return {
      id: songRequest.id,
      songName: songRequest.songName,
      artistName: songRequest.artistName || undefined,
      youtubeLink: songRequest.youtubeLink || undefined,
      spotifyLink: songRequest.spotifyLink || undefined,
      notes: songRequest.notes || undefined,
      status: songRequest.status as SongRequestStatus,
      upvotes: songRequest.upvotes,
      customerId: songRequest.customerId,
      customer: songRequest.customer,
      createdAt: songRequest.createdAt,
      updatedAt: songRequest.updatedAt,
      hasUpvoted: hasUpvoted,
    };
  }

  async create(customerId: string, createSongRequestDto: CreateSongRequestDto): Promise<SongRequestResponseDto> {
    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException(`Customer with ID ${customerId} not found`);
    }

    // Create the song request with 1 upvote from creator
    const createdSongRequest = await this.prisma.songRequest.create({
      data: {
        ...createSongRequestDto,
        customerId,
        status: SongRequestStatus.PENDING,
        upvotes: 1, // Start with 1 upvote from creator
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create the auto-upvote from the creator
    await this.prisma.songRequestUpvote.create({
      data: {
        songRequestId: createdSongRequest.id,
        customerId,
      },
    });

    // Convert null values to undefined for DTO compatibility and set hasUpvoted to true for creator
    return this.mapSongRequestToDto(createdSongRequest, true);
  }

  async findAll(status?: string, currentCustomerId?: string): Promise<SongRequestResponseDto[]> {
    const where = status ? { status: status.toUpperCase() } : {};

    const songRequests = await this.prisma.songRequest.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        upvotedBy: true,
      },
      orderBy: {
        upvotes: 'desc',
      },
    });

    // Convert null values to undefined for DTO compatibility and check upvote status
    return songRequests.map(request => {
      // Check if the current customer has upvoted this request
      let hasUpvoted = false;
      if (currentCustomerId) {
        hasUpvoted = request.upvotedBy.some(upvote => upvote.customerId === currentCustomerId);
      }

      return this.mapSongRequestToDto(request, hasUpvoted);
    });
  }

  async findAllByCustomer(customerId: string): Promise<SongRequestResponseDto[]> {
    const songRequests = await this.prisma.songRequest.findMany({
      where: {
        customerId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        upvotedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert null values to undefined for DTO compatibility
    return songRequests.map(request => this.mapSongRequestToDto(request));
  }

  async findOne(id: string, currentCustomerId?: string): Promise<SongRequestResponseDto> {
    const songRequest = await this.prisma.songRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        upvotedBy: true,
      },
    });

    if (!songRequest) {
      throw new NotFoundException(`Song request with ID ${id} not found`);
    }

    // Check if the current customer has upvoted this request
    let hasUpvoted = false;
    if (currentCustomerId) {
      hasUpvoted = songRequest.upvotedBy.some(upvote => upvote.customerId === currentCustomerId);
    }

    // Convert null values to undefined for DTO compatibility
    return this.mapSongRequestToDto(songRequest, hasUpvoted);
  }

  async update(id: string, updateSongRequestDto: UpdateSongRequestDto): Promise<SongRequestResponseDto> {
    // Check if song request exists
    const existingRequest = await this.prisma.songRequest.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!existingRequest) {
      throw new NotFoundException(`Song request with ID ${id} not found`);
    }

    // Check if status is being updated
    const statusChanged = updateSongRequestDto.status && updateSongRequestDto.status !== existingRequest.status;
    const newStatus = updateSongRequestDto.status;

    // Update the song request
    const updatedRequest = await this.prisma.songRequest.update({
      where: { id },
      data: updateSongRequestDto,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        upvotedBy: true,
      },
    });

    // Send notification if status changed to COMPLETED
    if (statusChanged && newStatus === SongRequestStatus.COMPLETED) {
      await this.notificationService.sendSongRequestCompletedNotification(
        existingRequest.customer.email,
        existingRequest.customer.name,
        existingRequest.songName,
      );
    }

    // Convert null values to undefined for DTO compatibility
    return this.mapSongRequestToDto(updatedRequest);
  }

  async remove(id: string): Promise<SongRequestResponseDto> {
    // Check if song request exists
    const existingRequest = await this.prisma.songRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      throw new NotFoundException(`Song request with ID ${id} not found`);
    }

    // Delete the song request
    const deletedRequest = await this.prisma.songRequest.delete({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Convert null values to undefined for DTO compatibility
    return this.mapSongRequestToDto(deletedRequest);
  }

  async upvote(songRequestId: string, customerId: string): Promise<UpvoteSongRequestResponseDto> {
    // Check if song request exists
    const songRequest = await this.prisma.songRequest.findUnique({
      where: { id: songRequestId },
    });

    if (!songRequest) {
      throw new NotFoundException(`Song request with ID ${songRequestId} not found`);
    }

    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException(`Customer with ID ${customerId} not found`);
    }

    // Check if customer has already upvoted this request
    const existingUpvote = await this.prisma.songRequestUpvote.findUnique({
      where: {
        songRequestId_customerId: {
          songRequestId,
          customerId,
        },
      },
    });

    if (existingUpvote) {
      throw new BadRequestException('You have already upvoted this song request');
    }

    // Create the upvote in a transaction
    const [upvote] = await this.prisma.$transaction([
      // Create the upvote
      this.prisma.songRequestUpvote.create({
        data: {
          songRequestId,
          customerId,
        },
      }),
      // Increment the upvotes count on the song request
      this.prisma.songRequest.update({
        where: { id: songRequestId },
        data: {
          upvotes: {
            increment: 1,
          },
        },
      }),
    ]);

    return upvote;
  }

  async removeUpvote(songRequestId: string, customerId: string): Promise<void> {
    // Check if upvote exists
    const existingUpvote = await this.prisma.songRequestUpvote.findUnique({
      where: {
        songRequestId_customerId: {
          songRequestId,
          customerId,
        },
      },
    });

    if (!existingUpvote) {
      throw new NotFoundException('You have not upvoted this song request');
    }

    // Check if the user is the creator of the song request
    const songRequest = await this.prisma.songRequest.findUnique({
      where: { id: songRequestId },
      select: { customerId: true },
    });

    if (songRequest && songRequest.customerId === customerId) {
      throw new BadRequestException('You cannot remove your upvote from your own song request');
    }

    // Remove the upvote in a transaction
    await this.prisma.$transaction([
      // Delete the upvote
      this.prisma.songRequestUpvote.delete({
        where: {
          songRequestId_customerId: {
            songRequestId,
            customerId,
          },
        },
      }),
      // Decrement the upvotes count on the song request
      this.prisma.songRequest.update({
        where: { id: songRequestId },
        data: {
          upvotes: {
            decrement: 1,
          },
        },
      }),
    ]);
  }
}
