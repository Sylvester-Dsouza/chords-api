import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SongService } from '../../services/song.service';
import { CreateSongDto, UpdateSongDto, SongResponseDto } from '../../dto/song.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('songs')
@Controller('songs')
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Post()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new song' })
  @ApiResponse({ status: 201, description: 'The song has been successfully created.', type: SongResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createSongDto: CreateSongDto): Promise<SongResponseDto> {
    return this.songService.create(createSongDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all songs' })
  @ApiResponse({ status: 200, description: 'Return all songs.', type: [SongResponseDto] })
  async findAll(
    @Query('search') search?: string,
    @Query('artistId') artistId?: string,
    @Query('tags') tags?: string,
  ): Promise<SongResponseDto[]> {
    return this.songService.findAll(search, artistId, tags);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a song by ID' })
  @ApiResponse({ status: 200, description: 'Return the song.', type: SongResponseDto })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async findOne(@Param('id') id: string): Promise<SongResponseDto> {
    return this.songService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a song' })
  @ApiResponse({ status: 200, description: 'The song has been successfully updated.', type: SongResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSongDto: UpdateSongDto,
  ): Promise<SongResponseDto> {
    return this.songService.update(id, updateSongDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a song' })
  @ApiResponse({ status: 200, description: 'The song has been successfully deleted.', type: SongResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async remove(@Param('id') id: string): Promise<SongResponseDto> {
    return this.songService.remove(id);
  }
}
