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
  constructor(private readonly songRequestService: SongRequestService) {}

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
  async findAll(@Query('status') status?: string): Promise<SongRequestResponseDto[]> {
    return this.songRequestService.findAll(status);
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
    @Param('id') id: string,
    @Req() req: RequestWithUser,
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
}
