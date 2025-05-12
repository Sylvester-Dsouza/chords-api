import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res, UseInterceptors, UploadedFile, BadRequestException, Req, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CollectionService } from '../../services/collection.service';
import { CreateCollectionDto, UpdateCollectionDto, CollectionResponseDto, AddSongToCollectionDto } from '../../dto/collection.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Public } from '../../decorators/public.decorator';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('collections')
@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiResponse({ status: 201, description: 'The collection has been successfully created.', type: CollectionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createCollectionDto: CreateCollectionDto): Promise<CollectionResponseDto> {
    return this.collectionService.create(createCollectionDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all collections' })
  @ApiResponse({ status: 200, description: 'Return all collections.', type: [CollectionResponseDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for filtering collections' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort collections by: mostLiked, mostViewed, newest' })
  async findAll(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Req() req?: RequestWithUser
  ): Promise<CollectionResponseDto[]> {
    const customerId = req?.user?.id;
    return this.collectionService.findAll(search, sortBy, customerId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a collection by ID' })
  @ApiResponse({ status: 200, description: 'Return the collection.', type: CollectionResponseDto })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async findOne(
    @Param('id') id: string,
    @Req() req?: RequestWithUser
  ): Promise<CollectionResponseDto> {
    const customerId = req?.user?.id;
    return this.collectionService.findOne(id, customerId);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a collection' })
  @ApiResponse({ status: 200, description: 'The collection has been successfully updated.', type: CollectionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.update(id, updateCollectionDto);
  }

  @Post(':id/songs')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a song to a collection' })
  @ApiResponse({ status: 200, description: 'The song has been successfully added to the collection.', type: CollectionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Collection or song not found.' })
  async addSong(
    @Param('id') id: string,
    @Body() addSongDto: AddSongToCollectionDto,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.addSong(id, addSongDto.songId);
  }

  @Delete(':id/songs/:songId')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a song from a collection' })
  @ApiResponse({ status: 200, description: 'The song has been successfully removed from the collection.', type: CollectionResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Collection or song not found.' })
  async removeSong(
    @Param('id') id: string,
    @Param('songId') songId: string,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.removeSong(id, songId);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a collection' })
  @ApiResponse({ status: 200, description: 'The collection has been successfully deleted.', type: CollectionResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async remove(@Param('id') id: string): Promise<CollectionResponseDto> {
    return this.collectionService.remove(id);
  }

  @Get('export/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all collections to CSV' })
  @ApiResponse({ status: 200, description: 'Return CSV file with all collections.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async exportToCsv(@Res() res: Response): Promise<void> {
    const csv = await this.collectionService.exportToCsv();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=collections.csv');
    res.send(csv);
  }

  @Get('export/songs/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all collection-song relationships to CSV' })
  @ApiResponse({ status: 200, description: 'Return CSV file with all collection-song relationships.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async exportSongRelationshipsToCsv(@Res() res: Response): Promise<void> {
    const csv = await this.collectionService.exportSongRelationshipsToCsv();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=collection-songs.csv');
    res.send(csv);
  }

  @Post('import/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import collections from CSV' })
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
  @ApiResponse({ status: 201, description: 'Collections imported successfully.' })
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

    return this.collectionService.importFromCsv(file.buffer);
  }

  @Post('import/songs/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import collection-song relationships from CSV' })
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
  @ApiResponse({ status: 201, description: 'Collection-song relationships imported successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async importSongRelationshipsFromCsv(@UploadedFile() file: Express.Multer.File): Promise<{ imported: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'text/csv' && file.mimetype !== 'application/vnd.ms-excel') {
      throw new BadRequestException('File must be a CSV');
    }

    return this.collectionService.importSongRelationshipsFromCsv(file.buffer);
  }
}
