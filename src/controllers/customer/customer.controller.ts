import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { CustomerService } from '../../services/customer.service';
import { PlaylistService } from '../../services/playlist.service';
import { LikedSongService } from '../../services/liked-song.service';
import { SongRequestService } from '../../services/song-request.service';
import { NotificationHistoryService } from '../../services/notification-history.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from '../../dto/customer.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PlaylistResponseDto } from '../../dto/playlist.dto';
import { SongResponseDto } from '../../dto/song.dto';
import { SongRequestResponseDto } from '../../dto/song-request.dto';
import { NotificationHistoryResponseDto } from '../../dto/notification.dto';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly playlistService: PlaylistService,
    private readonly likedSongService: LikedSongService,
    private readonly songRequestService: SongRequestService,
    private readonly notificationHistoryService: NotificationHistoryService,
  ) {}

  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'The customer has been successfully created.', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    return this.customerService.create(createCustomerDto);
  }

  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Return all customers.', type: [CustomerResponseDto] })
  @Get()
  findAll(): Promise<CustomerResponseDto[]> {
    return this.customerService.findAll();
  }

  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiResponse({ status: 200, description: 'Return the customer.', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiParam({ name: 'id', description: 'The ID of the customer' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customerService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'The customer has been successfully updated.', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiParam({ name: 'id', description: 'The ID of the customer to update' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customerService.update(id, updateCustomerDto);
  }

  @ApiOperation({ summary: 'Delete a customer' })
  @ApiResponse({ status: 200, description: 'The customer has been successfully deleted.', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiParam({ name: 'id', description: 'The ID of the customer to delete' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customerService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Get all playlists for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return all playlists for the customer.', type: [PlaylistResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get(':id/playlists')
  async getCustomerPlaylists(@Param('id') customerId: string): Promise<PlaylistResponseDto[]> {
    return this.playlistService.findAllByCustomer(customerId);
  }

  @ApiBearerAuth()
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Get all liked songs for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return all liked songs for the customer.', type: [SongResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get(':id/liked-songs')
  async getCustomerLikedSongs(@Param('id') customerId: string): Promise<SongResponseDto[]> {
    return this.likedSongService.findAllByCustomer(customerId);
  }

  @ApiBearerAuth()
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Get all song requests for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return all song requests for the customer.', type: [SongRequestResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get(':id/song-requests')
  async getCustomerSongRequests(@Param('id') customerId: string): Promise<SongRequestResponseDto[]> {
    return this.songRequestService.findAllByCustomer(customerId);
  }

  @ApiBearerAuth()
  @UseGuards(UserAuthGuard)
  @ApiOperation({ summary: 'Get notification history for a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return notification history for the customer.', type: [NotificationHistoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get(':id/notification-history')
  async getCustomerNotificationHistory(@Param('id') customerId: string): Promise<NotificationHistoryResponseDto[]> {
    return this.notificationHistoryService.findAllByCustomer(customerId);
  }

  @Get('export/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all customers to CSV' })
  @ApiResponse({ status: 200, description: 'Return CSV file with all customers.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async exportToCsv(@Res() res: Response): Promise<void> {
    const csv = await this.customerService.exportToCsv();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  }

  @Post('import/csv')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import customers from CSV' })
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
  @ApiResponse({ status: 201, description: 'Customers imported successfully.' })
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

    return this.customerService.importFromCsv(file.buffer);
  }
}
