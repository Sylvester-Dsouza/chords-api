import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SongRequestService } from '../../services/song-request.service';
import {
  CreateSongRequestDto,
  UpdateSongRequestDto,
  SongRequestResponseDto,
  UpvoteSongRequestResponseDto,
  SongRequestStatus,
} from '../../dto/song-request.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../services/prisma.service';
import { admin, isFirebaseInitialized } from '../../config/firebase.config';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('song-requests')
@Controller('song-requests')
export class SongRequestController {
  constructor(
    private readonly songRequestService: SongRequestService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new song request' })
  @ApiResponse({ status: 201, description: 'The song request has been successfully created.', type: SongRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createSongRequestDto: CreateSongRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<SongRequestResponseDto> {
    return this.songRequestService.create(req.user.id, createSongRequestDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all song requests' })
  @ApiQuery({ name: 'status', required: false, enum: SongRequestStatus })
  @ApiResponse({ status: 200, description: 'Return all song requests.', type: [SongRequestResponseDto] })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ): Promise<SongRequestResponseDto[]> {
    // Manually check for authentication to get upvote status
    let customerId: string | undefined;
    
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        if (token) {
          // Try to get customer from token without throwing errors
          const customer = await this.getCustomerFromToken(token);
          customerId = customer?.id;
        }
      }
    } catch (error) {
      // Ignore auth errors - just don't set customerId
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Optional auth failed, continuing without upvote status:', errorMessage);
    }
    
    return this.songRequestService.findAll(status, customerId);
  }

  @Get('my-requests')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all song requests made by the current customer' })
  @ApiResponse({ status: 200, description: 'Return all song requests made by the current customer.', type: [SongRequestResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAllByCustomer(@Req() req: RequestWithUser): Promise<SongRequestResponseDto[]> {
    return this.songRequestService.findAllByCustomer(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a song request by ID' })
  @ApiResponse({ status: 200, description: 'Return the song request.', type: SongRequestResponseDto })
  @ApiResponse({ status: 404, description: 'Song request not found.' })
  async findOne(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<SongRequestResponseDto> {
    // If the user is authenticated, pass their ID to check if they've upvoted
    const customerId = req.user?.id;
    return this.songRequestService.findOne(id, customerId);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a song request' })
  @ApiResponse({ status: 200, description: 'The song request has been successfully updated.', type: SongRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Song request not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSongRequestDto: UpdateSongRequestDto,
  ): Promise<SongRequestResponseDto> {
    return this.songRequestService.update(id, updateSongRequestDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a song request' })
  @ApiResponse({ status: 200, description: 'The song request has been successfully deleted.', type: SongRequestResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Song request not found.' })
  async remove(@Param('id') id: string): Promise<SongRequestResponseDto> {
    return this.songRequestService.remove(id);
  }

  @Post(':id/upvote')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvote a song request' })
  @ApiResponse({ status: 201, description: 'The song request has been successfully upvoted.', type: UpvoteSongRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Song request not found.' })
  async upvote(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<UpvoteSongRequestResponseDto> {
    return this.songRequestService.upvote(id, req.user.id);
  }

  @Delete(':id/upvote')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an upvote from a song request' })
  @ApiResponse({ status: 200, description: 'The upvote has been successfully removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Upvote not found.' })
  async removeUpvote(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.songRequestService.removeUpvote(id, req.user.id);
  }

  /**
   * Helper method to get customer from token without throwing errors
   * Used for optional authentication in public endpoints
   */
  private async getCustomerFromToken(token: string): Promise<{ id: string; email: string; name: string } | null> {
    try {
      // Check if Firebase is available
      if (!isFirebaseInitialized()) {
        return null;
      }

      // First, check if this is a custom token (mock_access_token_*)
      if (token.startsWith('mock_access_token_')) {
        const customerId = token.replace('mock_access_token_', '');
        const customer = await this.prismaService.customer.findUnique({
          where: { id: customerId },
          select: { id: true, email: true, name: true, isActive: true },
        });

        if (!customer || !customer.isActive) {
          return null;
        }

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        };
      } else {
        // Try to verify as Firebase token
        const decodedFirebaseToken = await admin.auth().verifyIdToken(token);
        const customer = await this.prismaService.customer.findUnique({
          where: { firebaseUid: decodedFirebaseToken.uid },
          select: { id: true, email: true, name: true, isActive: true },
        });

        if (!customer || !customer.isActive) {
          return null;
        }

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        };
      }
    } catch (error) {
      // Return null for any authentication errors
      return null;
    }
  }
}
