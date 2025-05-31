import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SongService } from '../../services/song.service';
import { CreateSongDto, UpdateSongDto, SongResponseDto } from '../../dto/song.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @Public()
  @ApiOperation({ summary: 'Get all songs' })
  @ApiResponse({ status: 200, description: 'Return all songs.', type: [SongResponseDto] })
  async findAll(
    @Query('search') search?: string,
    @Query('artistId') artistId?: string,
    @Query('tags') tags?: string,
  ): Promise<SongResponseDto[]> {
    return this.songService.findAll(search, artistId, tags);
  }

  @Get('debug')
  @Public()
  @ApiOperation({ summary: 'Debug endpoint to check songs in database' })
  @ApiResponse({ status: 200, description: 'Return debug information about songs.' })
  async debug(): Promise<any> {
    const totalSongs = await this.songService['prisma'].song.count();
    const activeSongs = await this.songService['prisma'].song.count({ where: { status: 'ACTIVE' } });
    const draftSongs = await this.songService['prisma'].song.count({ where: { status: 'DRAFT' } });
    const totalArtists = await this.songService['prisma'].artist.count();

    const sampleSongs = await this.songService['prisma'].song.findMany({
      take: 3,
      include: { artist: true },
    });

    return {
      message: 'Songs API Debug Info',
      counts: {
        totalSongs,
        activeSongs,
        draftSongs,
        totalArtists,
      },
      sampleSongs: sampleSongs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist?.name,
        status: song.status,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('paginated')
  @Public()
  @ApiOperation({ summary: 'Get songs with pagination' })
  @ApiResponse({ status: 200, description: 'Return paginated songs.' })
  async findAllPaginated(
    @Query('search') search?: string,
    @Query('artistId') artistId?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<{ data: SongResponseDto[]; pagination: any }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.songService.findAllPaginated({
      search,
      artistId,
      tags,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder,
    });
  }

  @Get('export/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all songs to CSV' })
  @ApiResponse({ status: 200, description: 'Return CSV file with all songs.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async exportToCsv(@Res() res: Response): Promise<void> {
    const csv = await this.songService.exportToCsv();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=songs.csv');
    res.send(csv);
  }

  @Get(':id')
  @Public()
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

  @Post('import/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import songs from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'Songs imported successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async importFromCsv(@UploadedFile() file: Express.Multer.File): Promise<{ imported: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'text/csv' && file.mimetype !== 'application/vnd.ms-excel') {
      throw new BadRequestException('File must be a CSV');
    }

    return this.songService.importFromCsv(file.buffer);
  }
}
