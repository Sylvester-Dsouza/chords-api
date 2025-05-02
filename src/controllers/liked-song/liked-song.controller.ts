import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LikedSongService } from '../../services/liked-song.service';
import { LikedSongResponseDto } from '../../dto/liked-song.dto';
import { SongResponseDto } from '../../dto/song.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('liked-songs')
@Controller('liked-songs')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class LikedSongController {
  constructor(private readonly likedSongService: LikedSongService) {}

  @Get()
  @ApiOperation({ summary: 'Get all liked songs for the current user' })
  @ApiResponse({ status: 200, description: 'Return all liked songs.', type: [SongResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Req() req: RequestWithUser): Promise<SongResponseDto[]> {
    const customerId = req.user.id;
    return this.likedSongService.findAllByCustomer(customerId);
  }

  @Post(':songId')
  @ApiOperation({ summary: 'Like a song' })
  @ApiResponse({ status: 201, description: 'The song has been successfully liked.', type: LikedSongResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async likeSong(
    @Param('songId') songId: string,
    @Req() req: RequestWithUser
  ): Promise<LikedSongResponseDto> {
    const customerId = req.user.id;
    return this.likedSongService.likeSong(customerId, songId);
  }

  @Delete(':songId')
  @ApiOperation({ summary: 'Unlike a song' })
  @ApiResponse({ status: 200, description: 'The song has been successfully unliked.', type: LikedSongResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Liked song not found.' })
  async unlikeSong(
    @Param('songId') songId: string,
    @Req() req: RequestWithUser
  ): Promise<LikedSongResponseDto> {
    const customerId = req.user.id;
    return this.likedSongService.unlikeSong(customerId, songId);
  }

  @Get(':songId')
  @ApiOperation({ summary: 'Check if a song is liked by the current user' })
  @ApiResponse({ status: 200, description: 'Return whether the song is liked.', type: Boolean })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async isLiked(
    @Param('songId') songId: string,
    @Req() req: RequestWithUser
  ): Promise<{ isLiked: boolean }> {
    const customerId = req.user.id;
    const isLiked = await this.likedSongService.isLiked(customerId, songId);
    return { isLiked };
  }
}
