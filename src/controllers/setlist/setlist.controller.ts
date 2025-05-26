import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SetlistService } from '../../services/setlist.service';
import { CreateSetlistDto, UpdateSetlistDto, SetlistResponseDto, AddSongToSetlistDto } from '../../dto/setlist.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('setlists')
@Controller('setlists')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class SetlistController {
  constructor(private readonly setlistService: SetlistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new setlist' })
  @ApiResponse({ status: 201, description: 'The setlist has been successfully created.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createSetlistDto: CreateSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.create(customerId, createSetlistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all setlists for the current user' })
  @ApiResponse({ status: 200, description: 'Return all setlists.', type: [SetlistResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Req() req: RequestWithUser): Promise<SetlistResponseDto[]> {
    const customerId = req.user.id;
    return this.setlistService.findAllByCustomer(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a setlist by ID' })
  @ApiResponse({ status: 200, description: 'Return the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.findOne(id, customerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a setlist' })
  @ApiResponse({ status: 200, description: 'The setlist has been successfully updated.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSetlistDto: UpdateSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.update(id, customerId, updateSetlistDto);
  }

  @Post(':id/songs')
  @ApiOperation({ summary: 'Add a song to a setlist' })
  @ApiResponse({ status: 200, description: 'The song has been successfully added to the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or song not found.' })
  async addSong(
    @Param('id') id: string,
    @Body() addSongDto: AddSongToSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.addSong(id, customerId, addSongDto.songId);
  }

  @Delete(':id/songs/:songId')
  @ApiOperation({ summary: 'Remove a song from a setlist' })
  @ApiResponse({ status: 200, description: 'The song has been successfully removed from the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or song not found.' })
  async removeSong(
    @Param('id') id: string,
    @Param('songId') songId: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.removeSong(id, customerId, songId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a setlist' })
  @ApiResponse({ status: 200, description: 'The setlist has been successfully deleted.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.remove(id, customerId);
  }
}
