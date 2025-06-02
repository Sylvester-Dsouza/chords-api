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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VocalService } from '../../services/vocal.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
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
  ReorderVocalCategoriesDto,
  ReorderVocalItemsDto,
} from '../../dto/vocal.dto';

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
}
