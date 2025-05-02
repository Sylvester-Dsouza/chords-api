import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TagService } from '../../services/tag.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto, SongTagDto, ArtistTagDto, CollectionTagDto } from '../../dto/tag.dto';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'The tag has been successfully created.', type: TagResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createTagDto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for tag name' })
  @ApiResponse({ status: 200, description: 'Return all tags.', type: [TagResponseDto] })
  findAll(@Query('search') search?: string): Promise<TagResponseDto[]> {
    return this.tagService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by id' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Return the tag.', type: TagResponseDto })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  findOne(@Param('id') id: string): Promise<TagResponseDto> {
    return this.tagService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'The tag has been successfully updated.', type: TagResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto): Promise<TagResponseDto> {
    return this.tagService.update(id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'The tag has been successfully deleted.', type: TagResponseDto })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  remove(@Param('id') id: string): Promise<TagResponseDto> {
    return this.tagService.remove(id);
  }

  @Post('song')
  @ApiOperation({ summary: 'Add a tag to a song' })
  @ApiResponse({ status: 204, description: 'The tag has been successfully added to the song.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Song or tag not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  addTagToSong(@Body() songTagDto: SongTagDto): Promise<void> {
    return this.tagService.addTagToSong(songTagDto);
  }

  @Delete('song')
  @ApiOperation({ summary: 'Remove a tag from a song' })
  @ApiResponse({ status: 204, description: 'The tag has been successfully removed from the song.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Relationship not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTagFromSong(@Body() songTagDto: SongTagDto): Promise<void> {
    return this.tagService.removeTagFromSong(songTagDto);
  }

  @Get('song/:songId')
  @ApiOperation({ summary: 'Get all tags for a song' })
  @ApiParam({ name: 'songId', description: 'Song ID' })
  @ApiResponse({ status: 200, description: 'Return all tags for the song.', type: [TagResponseDto] })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  getSongTags(@Param('songId') songId: string): Promise<TagResponseDto[]> {
    return this.tagService.getSongTags(songId);
  }

  @Get(':tagId/songs')
  @ApiOperation({ summary: 'Get all songs for a tag' })
  @ApiParam({ name: 'tagId', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Return all song IDs for the tag.', type: [String] })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  getTagSongs(@Param('tagId') tagId: string): Promise<string[]> {
    return this.tagService.getTagSongs(tagId);
  }

  // Artist tag endpoints
  @Post('artist')
  @ApiOperation({ summary: 'Add a tag to an artist' })
  @ApiResponse({ status: 204, description: 'The tag has been successfully added to the artist.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Artist or tag not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  addTagToArtist(@Body() artistTagDto: ArtistTagDto): Promise<void> {
    return this.tagService.addTagToArtist(artistTagDto);
  }

  @Delete('artist')
  @ApiOperation({ summary: 'Remove a tag from an artist' })
  @ApiResponse({ status: 204, description: 'The tag has been successfully removed from the artist.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Relationship not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTagFromArtist(@Body() artistTagDto: ArtistTagDto): Promise<void> {
    return this.tagService.removeTagFromArtist(artistTagDto);
  }

  @Get('artist/:artistId')
  @ApiOperation({ summary: 'Get all tags for an artist' })
  @ApiParam({ name: 'artistId', description: 'Artist ID' })
  @ApiResponse({ status: 200, description: 'Return all tags for the artist.', type: [TagResponseDto] })
  @ApiResponse({ status: 404, description: 'Artist not found.' })
  getArtistTags(@Param('artistId') artistId: string): Promise<TagResponseDto[]> {
    return this.tagService.getArtistTags(artistId);
  }

  @Get(':tagId/artists')
  @ApiOperation({ summary: 'Get all artists for a tag' })
  @ApiParam({ name: 'tagId', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Return all artist IDs for the tag.', type: [String] })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  getTagArtists(@Param('tagId') tagId: string): Promise<string[]> {
    return this.tagService.getTagArtists(tagId);
  }

  // Collection tag endpoints
  @Post('collection')
  @ApiOperation({ summary: 'Add a tag to a collection' })
  @ApiResponse({ status: 204, description: 'The tag has been successfully added to the collection.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Collection or tag not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  addTagToCollection(@Body() collectionTagDto: CollectionTagDto): Promise<void> {
    return this.tagService.addTagToCollection(collectionTagDto);
  }

  @Delete('collection')
  @ApiOperation({ summary: 'Remove a tag from a collection' })
  @ApiResponse({ status: 204, description: 'The tag has been successfully removed from the collection.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Relationship not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTagFromCollection(@Body() collectionTagDto: CollectionTagDto): Promise<void> {
    return this.tagService.removeTagFromCollection(collectionTagDto);
  }

  @Get('collection/:collectionId')
  @ApiOperation({ summary: 'Get all tags for a collection' })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Return all tags for the collection.', type: [TagResponseDto] })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  getCollectionTags(@Param('collectionId') collectionId: string): Promise<TagResponseDto[]> {
    return this.tagService.getCollectionTags(collectionId);
  }

  @Get(':tagId/collections')
  @ApiOperation({ summary: 'Get all collections for a tag' })
  @ApiParam({ name: 'tagId', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Return all collection IDs for the tag.', type: [String] })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  getTagCollections(@Param('tagId') tagId: string): Promise<string[]> {
    return this.tagService.getTagCollections(tagId);
  }
}
