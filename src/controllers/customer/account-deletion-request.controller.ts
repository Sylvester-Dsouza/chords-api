import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException
} from '@nestjs/common';
import { AccountDeletionRequestService } from '../../services/account-deletion-request.service';
import {
  CreateAccountDeletionRequestDto,
  UpdateAccountDeletionRequestDto,
  AccountDeletionRequestResponseDto
} from '../../dto/account-deletion-request.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('account-deletion')
@Controller('account-deletion')
export class AccountDeletionRequestController {
  constructor(private readonly accountDeletionRequestService: AccountDeletionRequestService) { }

  // Test endpoint that doesn't require authentication
  @Post('test')
  @ApiOperation({ summary: 'Test endpoint for account deletion API' })
  @ApiResponse({ status: 200, description: 'Test successful.' })
  async testEndpoint() {
    return { 
      message: 'Account deletion API is working correctly',
      timestamp: new Date().toISOString()
    };
  }

  // Customer endpoints
  @Post('request')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an account deletion request' })
  @ApiResponse({ status: 201, description: 'The request has been successfully created.', type: AccountDeletionRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createRequest(
    @Request() req: { user: { id: string } },
    @Body() createDto: CreateAccountDeletionRequestDto,
  ): Promise<AccountDeletionRequestResponseDto> {
    console.log('Creating account deletion request for customer:', req.user.id);
    console.log('Request data:', createDto);
    
    // Get customer ID from authenticated request
    const customerId = req.user.id;
    return this.accountDeletionRequestService.create(customerId, createDto);
  }

  @Get('my-requests')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all account deletion requests for the authenticated customer' })
  @ApiResponse({ status: 200, description: 'Return all requests for the customer.', type: [AccountDeletionRequestResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyRequests(@Request() req: { user: { id: string } }): Promise<AccountDeletionRequestResponseDto[]> {
    const customerId = req.user.id;
    return this.accountDeletionRequestService.findAllByCustomer(customerId);
  }

  // Admin endpoints
  @Get()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all account deletion requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return all requests.', type: [AccountDeletionRequestResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(): Promise<AccountDeletionRequestResponseDto[]> {
    return this.accountDeletionRequestService.findAll(true);
  }

  @Get(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an account deletion request by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the account deletion request' })
  @ApiResponse({ status: 200, description: 'Return the request.', type: AccountDeletionRequestResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Request not found.' })
  async findOne(@Param('id') id: string): Promise<AccountDeletionRequestResponseDto> {
    return this.accountDeletionRequestService.findOne(id, true);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an account deletion request (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the account deletion request to update' })
  @ApiResponse({ status: 200, description: 'The request has been successfully updated.', type: AccountDeletionRequestResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Request not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountDeletionRequestDto,
    @Request() req: { user: { id: string } },
  ): Promise<AccountDeletionRequestResponseDto> {
    // Add the admin user ID as the processor
    updateDto.processedBy = req.user.id;
    return this.accountDeletionRequestService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an account deletion request (Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the account deletion request to delete' })
  @ApiResponse({ status: 200, description: 'The request has been successfully deleted.', type: AccountDeletionRequestResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Request not found.' })
  async remove(@Param('id') id: string): Promise<AccountDeletionRequestResponseDto> {
    return this.accountDeletionRequestService.remove(id);
  }

  @Post(':id/execute')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute an approved account deletion (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'The ID of the account deletion request to execute' })
  @ApiResponse({ status: 200, description: 'The account has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Request not found.' })
  async executeAccountDeletion(
    @Param('id') id: string,
    @Request() req: { user: { id: string, role: UserRole } },
  ): Promise<{ message: string }> {
    // Only super admins can execute account deletions
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can execute account deletions');
    }

    await this.accountDeletionRequestService.executeAccountDeletion(id, req.user.id);
    return { message: 'Account deletion executed successfully' };
  }
}