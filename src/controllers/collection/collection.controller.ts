import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CollectionService } from '../../services/collection.service';
import { CreateCollectionDto, UpdateCollectionDto, CollectionResponseDto, AddSongToCollectionDto } from '../../dto/collection.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

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
  @ApiOperation({ summary: 'Get all collections' })
  @ApiResponse({ status: 200, description: 'Return all collections.', type: [CollectionResponseDto] })
  async findAll(@Query('search') search?: string): Promise<CollectionResponseDto[]> {
    return this.collectionService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a collection by ID' })
  @ApiResponse({ status: 200, description: 'Return the collection.', type: CollectionResponseDto })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async findOne(@Param('id') id: string): Promise<CollectionResponseDto> {
    return this.collectionService.findOne(id);
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
}
