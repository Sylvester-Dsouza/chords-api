import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CustomerService } from '../../services/customer.service';
import { PlaylistService } from '../../services/playlist.service';
import { LikedSongService } from '../../services/liked-song.service';
import { SongRequestService } from '../../services/song-request.service';
import { NotificationHistoryService } from '../../services/notification-history.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from '../../dto/customer.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { PlaylistResponseDto } from '../../dto/playlist.dto';
import { SongResponseDto } from '../../dto/song.dto';
import { SongRequestResponseDto } from '../../dto/song-request.dto';
import { NotificationHistoryResponseDto } from '../../dto/notification.dto';

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
}
