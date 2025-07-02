import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestDto,
  FeatureRequestResponseDto,
  UpvoteFeatureRequestResponseDto,
  FeatureRequestStatus,
  FeatureRequestPriority,
} from '../dto/feature-request.dto';

@Injectable()
export class FeatureRequestService {
  constructor(private prisma: PrismaService) {}

  private mapFeatureRequestToDto(featureRequest: any, hasUpvoted: boolean = false): FeatureRequestResponseDto {
    return {
      id: featureRequest.id,
      title: featureRequest.title,
      description: featureRequest.description,
      category: featureRequest.category || undefined,
      priority: featureRequest.priority,
      status: featureRequest.status,
      upvotes: featureRequest.upvotes,
      customerId: featureRequest.customerId,
      customer: featureRequest.customer ? {
        id: featureRequest.customer.id,
        name: featureRequest.customer.name,
        email: featureRequest.customer.email,
      } : undefined,
      createdAt: featureRequest.createdAt,
      updatedAt: featureRequest.updatedAt,
      hasUpvoted,
    };
  }

  async create(customerId: string, createFeatureRequestDto: CreateFeatureRequestDto): Promise<FeatureRequestResponseDto> {
    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException(`Customer with ID ${customerId} not found`);
    }

    // Create the feature request
    const featureRequest = await this.prisma.featureRequest.create({
      data: {
        ...createFeatureRequestDto,
        customerId,
        status: FeatureRequestStatus.PENDING,
        priority: FeatureRequestPriority.MEDIUM,
        upvotes: 0,
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

    return this.mapFeatureRequestToDto(featureRequest);
  }

  async findAll(status?: string, currentCustomerId?: string): Promise<FeatureRequestResponseDto[]> {
    const where = status ? { status: status.toUpperCase() } : {};

    const featureRequests = await this.prisma.featureRequest.findMany({
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

    // Convert and check upvote status
    return featureRequests.map(request => {
      // Check if the current customer has upvoted this request
      let hasUpvoted = false;
      if (currentCustomerId) {
        hasUpvoted = request.upvotedBy.some(upvote => upvote.customerId === currentCustomerId);
      }

      return this.mapFeatureRequestToDto(request, hasUpvoted);
    });
  }

  async findOne(id: string, currentCustomerId?: string): Promise<FeatureRequestResponseDto> {
    const featureRequest = await this.prisma.featureRequest.findUnique({
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

    if (!featureRequest) {
      throw new NotFoundException(`Feature request with ID ${id} not found`);
    }

    // Check if the current customer has upvoted this request
    let hasUpvoted = false;
    if (currentCustomerId) {
      hasUpvoted = featureRequest.upvotedBy.some(upvote => upvote.customerId === currentCustomerId);
    }

    return this.mapFeatureRequestToDto(featureRequest, hasUpvoted);
  }

  async update(id: string, updateFeatureRequestDto: UpdateFeatureRequestDto): Promise<FeatureRequestResponseDto> {
    // Check if feature request exists
    const existingRequest = await this.prisma.featureRequest.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!existingRequest) {
      throw new NotFoundException(`Feature request with ID ${id} not found`);
    }

    // Update the feature request
    const updatedRequest = await this.prisma.featureRequest.update({
      where: { id },
      data: updateFeatureRequestDto,
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

    return this.mapFeatureRequestToDto(updatedRequest);
  }

  async remove(id: string): Promise<FeatureRequestResponseDto> {
    // Check if feature request exists
    const existingRequest = await this.prisma.featureRequest.findUnique({
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

    if (!existingRequest) {
      throw new NotFoundException(`Feature request with ID ${id} not found`);
    }

    // Delete the feature request (this will cascade delete upvotes)
    const deletedRequest = await this.prisma.featureRequest.delete({
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

    return this.mapFeatureRequestToDto(deletedRequest);
  }

  async upvote(featureRequestId: string, customerId: string): Promise<UpvoteFeatureRequestResponseDto> {
    // Check if feature request exists
    const featureRequest = await this.prisma.featureRequest.findUnique({
      where: { id: featureRequestId },
    });

    if (!featureRequest) {
      throw new NotFoundException(`Feature request with ID ${featureRequestId} not found`);
    }

    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException(`Customer with ID ${customerId} not found`);
    }

    // Check if customer has already upvoted this request
    const existingUpvote = await this.prisma.featureRequestUpvote.findUnique({
      where: {
        featureRequestId_customerId: {
          featureRequestId,
          customerId,
        },
      },
    });

    if (existingUpvote) {
      throw new BadRequestException('Customer has already upvoted this feature request');
    }

    // Create the upvote and increment the upvote count
    const [upvote] = await this.prisma.$transaction([
      this.prisma.featureRequestUpvote.create({
        data: {
          featureRequestId,
          customerId,
        },
      }),
      this.prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: {
          upvotes: {
            increment: 1,
          },
        },
      }),
    ]);

    return {
      id: upvote.id,
      featureRequestId: upvote.featureRequestId,
      customerId: upvote.customerId,
      createdAt: upvote.createdAt,
    };
  }

  async removeUpvote(featureRequestId: string, customerId: string): Promise<void> {
    // Check if the upvote exists
    const existingUpvote = await this.prisma.featureRequestUpvote.findUnique({
      where: {
        featureRequestId_customerId: {
          featureRequestId,
          customerId,
        },
      },
    });

    if (!existingUpvote) {
      throw new NotFoundException('Upvote not found');
    }

    // Remove the upvote and decrement the upvote count
    await this.prisma.$transaction([
      this.prisma.featureRequestUpvote.delete({
        where: {
          featureRequestId_customerId: {
            featureRequestId,
            customerId,
          },
        },
      }),
      this.prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: {
          upvotes: {
            decrement: 1,
          },
        },
      }),
    ]);
  }
}
