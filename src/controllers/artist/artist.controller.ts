import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ArtistService } from '../../services/artist.service';
import { CreateArtistDto, UpdateArtistDto, ArtistResponseDto } from '../../dto/artist.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('artists')
@Controller('artists')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Post()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new artist' })
  @ApiResponse({ status: 201, description: 'The artist has been successfully created.', type: ArtistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createArtistDto: CreateArtistDto): Promise<ArtistResponseDto> {
    return this.artistService.create(createArtistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all artists' })
  @ApiResponse({ status: 200, description: 'Return all artists.', type: [ArtistResponseDto] })
  async findAll(@Query('search') search?: string): Promise<ArtistResponseDto[]> {
    return this.artistService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an artist by ID' })
  @ApiResponse({ status: 200, description: 'Return the artist.', type: ArtistResponseDto })
  @ApiResponse({ status: 404, description: 'Artist not found.' })
  async findOne(@Param('id') id: string): Promise<ArtistResponseDto> {
    return this.artistService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an artist' })
  @ApiResponse({ status: 200, description: 'The artist has been successfully updated.', type: ArtistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Artist not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateArtistDto: UpdateArtistDto,
  ): Promise<ArtistResponseDto> {
    return this.artistService.update(id, updateArtistDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an artist' })
  @ApiResponse({ status: 200, description: 'The artist has been successfully deleted.', type: ArtistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Artist not found.' })
  async remove(@Param('id') id: string): Promise<ArtistResponseDto> {
    return this.artistService.remove(id);
  }

  @Get('export/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all artists to CSV' })
  @ApiResponse({ status: 200, description: 'Return CSV file with all artists.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async exportToCsv(@Res() res: Response): Promise<void> {
    const csv = await this.artistService.exportToCsv();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=artists.csv');
    res.send(csv);
  }

  @Post('import/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import artists from CSV' })
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
  @ApiResponse({ status: 201, description: 'Artists imported successfully.' })
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

    return this.artistService.importFromCsv(file.buffer);
  }
}
