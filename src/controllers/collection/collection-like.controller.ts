import { Controller, Get, Post, Param, UseGuards, Req, HttpCode, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CollectionLikeService } from '../../services/collection-like.service';
import { CollectionService } from '../../services/collection.service';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { CollectionLikeResponseDto, CollectionLikeStatusDto } from '../../dto/collection-like.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('collections')
@Controller('collections')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class CollectionLikeController {
  constructor(
    private readonly collectionLikeService: CollectionLikeService,
    private readonly collectionService: CollectionService,
  ) {}

  @Post(':id/like')
  @HttpCode(200)
  @ApiOperation({ summary: 'Toggle like status for a collection' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Like status toggled successfully.', type: CollectionLikeStatusDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async toggleLike(
    @Param('id') collectionId: string,
    @Req() req: RequestWithUser,
  ): Promise<CollectionLikeStatusDto> {
    const customerId = req.user.id;
    
    // Check if collection exists
    const collection = await this.collectionService.findOne(collectionId);
    if (!collection) {
      throw new NotFoundException(`Collection with ID ${collectionId} not found`);
    }
    
    return this.collectionLikeService.toggleLike(collectionId, customerId);
  }

  @Get(':id/like')
  @ApiOperation({ summary: 'Get like status for a collection' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Like status retrieved successfully.', type: CollectionLikeStatusDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async getLikeStatus(
    @Param('id') collectionId: string,
    @Req() req: RequestWithUser,
  ): Promise<CollectionLikeStatusDto> {
    const customerId = req.user.id;
    
    // Check if collection exists
    const collection = await this.collectionService.findOne(collectionId);
    if (!collection) {
      throw new NotFoundException(`Collection with ID ${collectionId} not found`);
    }
    
    return this.collectionLikeService.getLikeStatus(collectionId, customerId);
  }

  @Get('liked')
  @ApiOperation({ summary: 'Get all collections liked by the current customer' })
  @ApiResponse({ status: 200, description: 'Liked collections retrieved successfully.', type: [CollectionLikeResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getLikedCollections(
    @Req() req: RequestWithUser,
  ): Promise<CollectionLikeResponseDto[]> {
    const customerId = req.user.id;
    return this.collectionLikeService.getLikedCollections(customerId);
  }
}
