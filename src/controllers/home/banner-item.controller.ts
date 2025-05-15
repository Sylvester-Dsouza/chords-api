import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BannerItemService } from '../../services/banner-item.service';
import { CreateBannerItemDto, UpdateBannerItemDto, ReorderBannerItemsDto } from '../../dto/banner-item.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { UserRole, BannerItem } from '@prisma/client';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('Banner Items')
@Controller('banner-items')
export class BannerItemController {
  constructor(private readonly bannerItemService: BannerItemService) {}

  @Post(':homeSectionId')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new banner item for a home section' })
  @ApiResponse({ status: 201, description: 'The banner item has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Home section not found.' })
  async create(
    @Param('homeSectionId') homeSectionId: string,
    @Body() createBannerItemDto: CreateBannerItemDto
  ): Promise<BannerItem> {
    return this.bannerItemService.create(homeSectionId, createBannerItemDto);
  }

  @Get('section/:homeSectionId')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all banner items for a home section' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive banner items' })
  @ApiResponse({ status: 200, description: 'Return all banner items for the home section.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Home section not found.' })
  async findAll(
    @Param('homeSectionId') homeSectionId: string,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean
  ): Promise<BannerItem[]> {
    return this.bannerItemService.findAll(homeSectionId, includeInactive);
  }

  @Get(':id')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a banner item by ID' })
  @ApiResponse({ status: 200, description: 'Return the banner item.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Banner item not found.' })
  async findOne(@Param('id') id: string): Promise<BannerItem> {
    return this.bannerItemService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a banner item' })
  @ApiResponse({ status: 200, description: 'The banner item has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Banner item not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateBannerItemDto: UpdateBannerItemDto
  ): Promise<BannerItem> {
    return this.bannerItemService.update(id, updateBannerItemDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a banner item' })
  @ApiResponse({ status: 200, description: 'The banner item has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Banner item not found.' })
  async remove(@Param('id') id: string): Promise<BannerItem> {
    return this.bannerItemService.remove(id);
  }

  @Patch('reorder/:homeSectionId')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder banner items within a home section' })
  @ApiResponse({ status: 200, description: 'The banner items have been successfully reordered.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Home section or one or more banner items not found.' })
  async reorder(
    @Param('homeSectionId') homeSectionId: string,
    @Body() reorderDto: ReorderBannerItemsDto
  ): Promise<BannerItem[]> {
    return this.bannerItemService.reorder(homeSectionId, reorderDto);
  }
}
