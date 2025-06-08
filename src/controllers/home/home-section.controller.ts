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
import { HomeSectionService } from '../../services/home-section.service';
import { CreateHomeSectionDto, UpdateHomeSectionDto, HomeSectionDto, ReorderHomeSectionsDto } from '../../dto/home-section.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { UserRole, SectionType } from '@prisma/client';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';

@ApiTags('Home Sections')
@Controller('home-sections')
export class HomeSectionController {
  constructor(private readonly homeSectionService: HomeSectionService) {}

  @Post()
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new home section' })
  @ApiResponse({ status: 201, description: 'The home section has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createHomeSectionDto: CreateHomeSectionDto): Promise<HomeSectionDto> {
    console.log('Creating home section with data:', JSON.stringify(createHomeSectionDto, null, 2));
    try {
      const result = await this.homeSectionService.create(createHomeSectionDto);
      console.log('Home section created successfully');
      return result;
    } catch (error: any) {
      console.error('Error creating home section:', error.message || 'Unknown error');
      if (error.response) {
        console.error('Error details:', error.response);
      }
      throw error;
    }
  }

  @Get()
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all home sections' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive sections' })
  @ApiResponse({ status: 200, description: 'Return all home sections.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean
  ): Promise<HomeSectionDto[]> {
    return this.homeSectionService.findAll(includeInactive);
  }

  @Get(':id')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a home section by ID' })
  @ApiResponse({ status: 200, description: 'Return the home section.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Home section not found.' })
  async findOne(@Param('id') id: string): Promise<HomeSectionDto> {
    return this.homeSectionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a home section' })
  @ApiResponse({ status: 200, description: 'The home section has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Home section not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateHomeSectionDto: UpdateHomeSectionDto
  ): Promise<HomeSectionDto> {
    return this.homeSectionService.update(id, updateHomeSectionDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a home section' })
  @ApiResponse({ status: 200, description: 'The home section has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Home section not found.' })
  async remove(@Param('id') id: string): Promise<HomeSectionDto> {
    return this.homeSectionService.remove(id);
  }

  @Patch('reorder')
  @UseGuards(UserAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder home sections' })
  @ApiResponse({ status: 200, description: 'The home sections have been successfully reordered.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'One or more home sections not found.' })
  async reorder(@Body() reorderDto: ReorderHomeSectionsDto): Promise<HomeSectionDto[]> {
    return this.homeSectionService.reorder(reorderDto);
  }

  @Get('app/content')
  @ApiOperation({ summary: 'Get home sections for the mobile app with incremental sync support' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO timestamp to get only updated sections since this time' })
  @ApiResponse({ status: 200, description: 'Return home sections with content for the app.' })
  async getHomeSectionsForApp(@Query('since') since?: string): Promise<any[]> {
    return this.homeSectionService.getHomeSectionsForApp(since);
  }

  @Get('app/section/:id/items')
  @Public()
  @ApiOperation({ summary: 'Get all items for a specific section by ID for the mobile app' })
  @ApiResponse({ status: 200, description: 'Return all items for the section.' })
  @ApiResponse({ status: 404, description: 'Section not found.' })
  async getSectionItems(@Param('id') id: string): Promise<any[]> {
    return this.homeSectionService.getSectionItemsForApp(id);
  }

  @Get('debug/collection/:name')
  @Public()
  @ApiOperation({ summary: 'Debug collection visibility in home sections' })
  @ApiResponse({ status: 200, description: 'Debug information retrieved successfully.' })
  async debugCollectionVisibility(@Param('name') name: string): Promise<any> {
    return this.homeSectionService.debugCollectionVisibility(name);
  }

  @Get('test-create')
  @ApiOperation({ summary: 'Test endpoint to create a banner section' })
  @ApiResponse({ status: 201, description: 'Test banner section created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  // Skip authentication for this test endpoint
  @Public()
  async testCreate(): Promise<HomeSectionDto> {
    console.log('Testing banner section creation');
    try {
      const testData: CreateHomeSectionDto = {
        title: 'Test Banner Section',
        type: SectionType.BANNER,
        itemIds: []
      };
      console.log('Test data:', JSON.stringify(testData, null, 2));
      const result = await this.homeSectionService.create(testData);
      console.log('Test successful, created section:', result.id);
      return result;
    } catch (error: any) {
      console.error('Test failed:', error.message);
      if (error.meta) {
        console.error('Error meta:', error.meta);
      }
      throw error;
    }
  }
}
