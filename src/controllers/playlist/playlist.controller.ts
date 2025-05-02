import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlaylistService } from '../../services/playlist.service';
import { CreatePlaylistDto, UpdatePlaylistDto, PlaylistResponseDto, AddSongToPlaylistDto } from '../../dto/playlist.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('playlists')
@Controller('playlists')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new playlist' })
  @ApiResponse({ status: 201, description: 'The playlist has been successfully created.', type: PlaylistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createPlaylistDto: CreatePlaylistDto,
    @Req() req: RequestWithUser
  ): Promise<PlaylistResponseDto> {
    const customerId = req.user.id;
    return this.playlistService.create(customerId, createPlaylistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all playlists for the current user' })
  @ApiResponse({ status: 200, description: 'Return all playlists.', type: [PlaylistResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Req() req: RequestWithUser): Promise<PlaylistResponseDto[]> {
    const customerId = req.user.id;
    return this.playlistService.findAllByCustomer(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a playlist by ID' })
  @ApiResponse({ status: 200, description: 'Return the playlist.', type: PlaylistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Playlist not found.' })
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<PlaylistResponseDto> {
    const customerId = req.user.id;
    return this.playlistService.findOne(id, customerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a playlist' })
  @ApiResponse({ status: 200, description: 'The playlist has been successfully updated.', type: PlaylistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Playlist not found.' })
  async update(
    @Param('id') id: string,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
    @Req() req: RequestWithUser
  ): Promise<PlaylistResponseDto> {
    const customerId = req.user.id;
    return this.playlistService.update(id, customerId, updatePlaylistDto);
  }

  @Post(':id/songs')
  @ApiOperation({ summary: 'Add a song to a playlist' })
  @ApiResponse({ status: 200, description: 'The song has been successfully added to the playlist.', type: PlaylistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Playlist or song not found.' })
  async addSong(
    @Param('id') id: string,
    @Body() addSongDto: AddSongToPlaylistDto,
    @Req() req: RequestWithUser
  ): Promise<PlaylistResponseDto> {
    const customerId = req.user.id;
    return this.playlistService.addSong(id, customerId, addSongDto.songId);
  }

  @Delete(':id/songs/:songId')
  @ApiOperation({ summary: 'Remove a song from a playlist' })
  @ApiResponse({ status: 200, description: 'The song has been successfully removed from the playlist.', type: PlaylistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Playlist or song not found.' })
  async removeSong(
    @Param('id') id: string,
    @Param('songId') songId: string,
    @Req() req: RequestWithUser
  ): Promise<PlaylistResponseDto> {
    const customerId = req.user.id;
    return this.playlistService.removeSong(id, customerId, songId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a playlist' })
  @ApiResponse({ status: 200, description: 'The playlist has been successfully deleted.', type: PlaylistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Playlist not found.' })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<PlaylistResponseDto> {
    const customerId = req.user.id;
    return this.playlistService.remove(id, customerId);
  }
}
