import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LanguageService } from '../../services/language.service';
import { CreateLanguageDto, UpdateLanguageDto, LanguageResponseDto } from '../../dto/language.dto';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('languages')
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Post()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new language' })
  @ApiResponse({ status: 201, description: 'The language has been successfully created.', type: LanguageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createLanguageDto: CreateLanguageDto): Promise<LanguageResponseDto> {
    return this.languageService.create(createLanguageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all languages' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean, description: 'Filter to only active languages' })
  @ApiResponse({ status: 200, description: 'Return all languages.', type: [LanguageResponseDto] })
  async findAll(@Query('onlyActive') onlyActive?: string | boolean): Promise<LanguageResponseDto[]> {
    return this.languageService.findAll(onlyActive === 'true' || onlyActive === true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a language by ID' })
  @ApiResponse({ status: 200, description: 'Return the language.', type: LanguageResponseDto })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  async findOne(@Param('id') id: string): Promise<LanguageResponseDto> {
    return this.languageService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a language' })
  @ApiResponse({ status: 200, description: 'The language has been successfully updated.', type: LanguageResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ): Promise<LanguageResponseDto> {
    return this.languageService.update(id, updateLanguageDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a language' })
  @ApiResponse({ status: 200, description: 'The language has been successfully deleted.', type: LanguageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Language not found.' })
  async remove(@Param('id') id: string): Promise<LanguageResponseDto> {
    return this.languageService.remove(id);
  }
}
