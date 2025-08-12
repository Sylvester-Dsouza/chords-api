import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { VocalService } from '../../services/vocal.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, VocalType } from '@prisma/client';
import {
  CreateVocalCategoryDto,
  UpdateVocalCategoryDto,
  VocalCategoryResponseDto,
  VocalCategoryWithItemsResponseDto,
  CreateVocalItemDto,
  UpdateVocalItemDto,
  VocalItemResponseDto,
  CreateVocalLibraryDto,
  UpdateVocalLibraryDto,
  VocalLibraryResponseDto,
  ReorderVocalCategoriesDto,
  ReorderVocalItemsDto,
  CreateCustomerVocalCategoryDto,
  UpdateCustomerVocalCategoryDto,
  AddItemToCustomerCategoryDto,
  CustomerVocalCategoryResponseDto,
  CustomerVocalCategoryWithItemsResponseDto,
} from '../../dto/vocal.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('vocal')
@Controller('vocal')
export class VocalController {
  constructor(private readonly vocalService: VocalService) {}

  // Category endpoints
  @Post('categories')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vocal category' })
  @ApiResponse({ status: 201, description: 'The vocal category has been successfully created.', type: VocalCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createCategory(@Body() createVocalCategoryDto: CreateVocalCategoryDto): Promise<VocalCategoryResponseDto> {
    return this.vocalService.createCategory(createVocalCategoryDto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all vocal categories' })
  @ApiQuery({ name: 'type', enum: VocalType, required: false, description: 'Filter by vocal type' })
  @ApiQuery({ name: 'onlyActive', type: Boolean, required: false, description: 'Only return active categories' })
  @ApiResponse({ status: 200, description: 'Return all vocal categories.', type: [VocalCategoryResponseDto] })
  async findAllCategories(
    @Query('type') type?: VocalType,
    @Query('onlyActive') onlyActive?: string,
  ): Promise<VocalCategoryResponseDto[]> {
    const isOnlyActive = onlyActive === 'true';
    return this.vocalService.findAllCategories(type, isOnlyActive);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a vocal category by ID' })
  @ApiResponse({ status: 200, description: 'Return the vocal category.', type: VocalCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Vocal category not found.' })
  async findCategoryById(@Param('id') id: string): Promise<VocalCategoryResponseDto> {
    return this.vocalService.findCategoryById(id);
  }

  @Get('categories/:id/with-items')
  @ApiOperation({ summary: 'Get a vocal category with its items' })
  @ApiResponse({ status: 200, description: 'Return the vocal category with items.', type: VocalCategoryWithItemsResponseDto })
  @ApiResponse({ status: 404, description: 'Vocal category not found.' })
  async findCategoryWithItems(@Param('id') id: string): Promise<VocalCategoryWithItemsResponseDto> {
    return this.vocalService.findCategoryWithItems(id);
  }

  @Patch('categories/:id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vocal category' })
  @ApiResponse({ status: 200, description: 'The vocal category has been successfully updated.', type: VocalCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal category not found.' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateVocalCategoryDto: UpdateVocalCategoryDto,
  ): Promise<VocalCategoryResponseDto> {
    return this.vocalService.updateCategory(id, updateVocalCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vocal category' })
  @ApiResponse({ status: 204, description: 'The vocal category has been successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Category has items.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal category not found.' })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    return this.vocalService.deleteCategory(id);
  }

  @Post('categories/reorder')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder vocal categories' })
  @ApiResponse({ status: 204, description: 'The vocal categories have been successfully reordered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async reorderCategories(@Body() reorderDto: ReorderVocalCategoriesDto): Promise<void> {
    return this.vocalService.reorderCategories(reorderDto);
  }

  // Item endpoints
  @Post('items')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vocal item' })
  @ApiResponse({ status: 201, description: 'The vocal item has been successfully created.', type: VocalItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal category not found.' })
  async createItem(@Body() createVocalItemDto: CreateVocalItemDto): Promise<VocalItemResponseDto> {
    return this.vocalService.createItem(createVocalItemDto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all vocal items' })
  @ApiQuery({ name: 'categoryId', type: String, required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'onlyActive', type: Boolean, required: false, description: 'Only return active items' })
  @ApiResponse({ status: 200, description: 'Return all vocal items.', type: [VocalItemResponseDto] })
  async findAllItems(
    @Query('categoryId') categoryId?: string,
    @Query('onlyActive') onlyActive?: string,
  ): Promise<VocalItemResponseDto[]> {
    const isOnlyActive = onlyActive === 'true';
    return this.vocalService.findAllItems(categoryId, isOnlyActive);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get a vocal item by ID' })
  @ApiResponse({ status: 200, description: 'Return the vocal item.', type: VocalItemResponseDto })
  @ApiResponse({ status: 404, description: 'Vocal item not found.' })
  async findItemById(@Param('id') id: string): Promise<VocalItemResponseDto> {
    return this.vocalService.findItemById(id);
  }

  @Patch('items/:id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vocal item' })
  @ApiResponse({ status: 200, description: 'The vocal item has been successfully updated.', type: VocalItemResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal item not found.' })
  async updateItem(
    @Param('id') id: string,
    @Body() updateVocalItemDto: UpdateVocalItemDto,
  ): Promise<VocalItemResponseDto> {
    return this.vocalService.updateItem(id, updateVocalItemDto);
  }

  @Delete('items/:id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vocal item' })
  @ApiResponse({ status: 204, description: 'The vocal item has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal item not found.' })
  async deleteItem(@Param('id') id: string): Promise<void> {
    return this.vocalService.deleteItem(id);
  }

  @Post('categories/:categoryId/items/reorder')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder vocal items within a category' })
  @ApiResponse({ status: 204, description: 'The vocal items have been successfully reordered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async reorderItems(
    @Param('categoryId') categoryId: string,
    @Body() reorderDto: ReorderVocalItemsDto,
  ): Promise<void> {
    return this.vocalService.reorderItems(categoryId, reorderDto);
  }

  // Audio File endpoints (Centralized Audio Library)
  @Post('audio-files')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new vocal audio file' })
  @ApiResponse({ status: 201, description: 'The vocal library item has been successfully created.', type: VocalLibraryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createAudioFile(@Body() createVocalLibraryDto: CreateVocalLibraryDto): Promise<VocalLibraryResponseDto> {
    return this.vocalService.createAudioFile(createVocalLibraryDto);
  }

  @Get('audio-files')
  @ApiOperation({ summary: 'Get all vocal audio files' })
  @ApiQuery({ name: 'onlyActive', type: Boolean, required: false, description: 'Only return active audio files' })
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Search query for name, filename, or description' })
  @ApiQuery({ name: 'tags', type: [String], required: false, description: 'Filter by tags' })
  @ApiResponse({ status: 200, description: 'Return all vocal library items.', type: [VocalLibraryResponseDto] })
  async findAllAudioFiles(
    @Query('onlyActive') onlyActive?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string | string[],
  ): Promise<VocalLibraryResponseDto[]> {
    const isOnlyActive = onlyActive === 'true';
    
    if (search) {
      // Convert tags to array if it's a string
      const tagsArray = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;
      return this.vocalService.searchAudioFiles(search, tagsArray);
    }
    
    return this.vocalService.findAllAudioFiles(isOnlyActive);
  }

  @Get('audio-files/:id')
  @ApiOperation({ summary: 'Get a vocal audio file by ID' })
  @ApiResponse({ status: 200, description: 'Return the vocal library item.', type: VocalLibraryResponseDto })
  @ApiResponse({ status: 404, description: 'Vocal audio file not found.' })
  async findAudioFileById(@Param('id') id: string): Promise<VocalLibraryResponseDto> {
    return this.vocalService.findAudioFileById(id);
  }

  @Patch('audio-files/:id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vocal audio file' })
  @ApiResponse({ status: 200, description: 'The vocal library item has been successfully updated.', type: VocalLibraryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal audio file not found.' })
  async updateAudioFile(
    @Param('id') id: string,
    @Body() updateVocalLibraryDto: UpdateVocalLibraryDto,
  ): Promise<VocalLibraryResponseDto> {
    return this.vocalService.updateAudioFile(id, updateVocalLibraryDto);
  }

  @Delete('audio-files/:id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vocal audio file' })
  @ApiResponse({ status: 204, description: 'The vocal audio file has been successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Audio file is being used by vocal items.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vocal audio file not found.' })
  async deleteAudioFile(@Param('id') id: string): Promise<void> {
    return this.vocalService.deleteAudioFile(id);
  }

  // Audio File Upload endpoint
  @Post('audio-files/upload')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an audio file for vocal exercises' })
  @ApiResponse({ 
    status: 201, 
    description: 'Audio file uploaded successfully and VocalLibrary item created.', 
    type: VocalLibraryResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid file or missing data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async uploadAudioFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string,
  ): Promise<VocalLibraryResponseDto> {
    return this.vocalService.uploadAudioFile(file, {
      name: name || file.originalname,
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    });
  }

  // Customer Vocal Category endpoints
  @Post('customer/categories')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a customer vocal category' })
  @ApiResponse({ status: 201, description: 'Customer vocal category created successfully.', type: CustomerVocalCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createCustomerCategory(
    @Body() createDto: CreateCustomerVocalCategoryDto,
    @Req() req: RequestWithUser,
  ): Promise<CustomerVocalCategoryResponseDto> {
    return this.vocalService.createCustomerCategory(req.user.id, createDto);
  }

  @Get('customer/categories')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer vocal categories' })
  @ApiQuery({ name: 'type', enum: VocalType, required: false, description: 'Filter by vocal type' })
  @ApiResponse({ status: 200, description: 'Return customer vocal categories.', type: [CustomerVocalCategoryResponseDto] })
  async getCustomerCategories(
    @Req() req: RequestWithUser,
    @Query('type') type?: VocalType,
  ): Promise<CustomerVocalCategoryResponseDto[]> {
    return this.vocalService.getCustomerCategories(req.user.id, type);
  }

  @Get('customer/items')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customer vocal items' })
  @ApiResponse({ status: 200, description: 'Return all customer vocal items.', type: [VocalItemResponseDto] })
  async getCustomerItems(
    @Req() req: RequestWithUser,
  ): Promise<VocalItemResponseDto[]> {
    return this.vocalService.getCustomerItems(req.user.id);
  }

  @Get('customer/categories/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer vocal category with items' })
  @ApiResponse({ status: 200, description: 'Return customer vocal category with items.', type: CustomerVocalCategoryWithItemsResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async getCustomerCategoryWithItems(
    @Param('id') categoryId: string,
    @Req() req: RequestWithUser,
  ): Promise<CustomerVocalCategoryWithItemsResponseDto> {
    return this.vocalService.getCustomerCategoryWithItems(req.user.id, categoryId);
  }

  @Patch('customer/categories/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer vocal category' })
  @ApiResponse({ status: 200, description: 'Customer vocal category updated successfully.', type: CustomerVocalCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async updateCustomerCategory(
    @Param('id') categoryId: string,
    @Body() updateDto: UpdateCustomerVocalCategoryDto,
    @Req() req: RequestWithUser,
  ): Promise<CustomerVocalCategoryResponseDto> {
    return this.vocalService.updateCustomerCategory(categoryId, req.user.id, updateDto);
  }

  @Delete('customer/categories/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer vocal category' })
  @ApiResponse({ status: 204, description: 'Customer vocal category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async deleteCustomerCategory(
    @Param('id') categoryId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.vocalService.deleteCustomerCategory(req.user.id, categoryId);
  }

  @Post('customer/categories/:id/items')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to customer vocal category' })
  @ApiResponse({ status: 201, description: 'Item added to customer category successfully.', type: VocalItemResponseDto })
  @ApiResponse({ status: 404, description: 'Category or audio file not found.' })
  async addItemToCustomerCategory(
    @Param('id') categoryId: string,
    @Body() addItemDto: AddItemToCustomerCategoryDto,
    @Req() req: RequestWithUser,
  ): Promise<VocalItemResponseDto> {
    return this.vocalService.addItemToCustomerCategory(req.user.id, categoryId, addItemDto);
  }

  @Delete('customer/categories/:categoryId/items/:itemId')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from customer vocal category' })
  @ApiResponse({ status: 204, description: 'Item removed from customer category successfully.' })
  @ApiResponse({ status: 404, description: 'Category or item not found.' })
  async removeItemFromCustomerCategory(
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.vocalService.removeItemFromCustomerCategory(categoryId, itemId, req.user.id);
  }

  @Patch('customer/categories/:categoryId/items/reorder')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder items in customer vocal category' })
  @ApiResponse({ status: 204, description: 'Items reordered successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async reorderCustomerCategoryItems(
    @Param('categoryId') categoryId: string,
    @Body() reorderDto: ReorderVocalItemsDto,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.vocalService.reorderCustomerCategoryItems(categoryId, req.user.id, reorderDto);
  }

  @Get('public/categories')
  @ApiOperation({ summary: 'Get public customer vocal categories' })
  @ApiQuery({ name: 'type', enum: VocalType, required: false, description: 'Filter by vocal type' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Limit results' })
  @ApiResponse({ status: 200, description: 'Return public customer vocal categories.', type: [CustomerVocalCategoryResponseDto] })
  async getPublicCustomerCategories(
    @Query('type') type?: VocalType,
    @Query('limit') limit?: number,
  ): Promise<CustomerVocalCategoryResponseDto[]> {
    return this.vocalService.getPublicCustomerCategories(type, limit);
  }
}
