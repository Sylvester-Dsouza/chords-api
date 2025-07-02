import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeatureRequestService } from '../../services/feature-request.service';
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestDto,
  FeatureRequestResponseDto,
  UpvoteFeatureRequestResponseDto,
  FeatureRequestStatus,
} from '../../dto/feature-request.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

// Define the Request with User interface
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

@ApiTags('feature-requests')
@Controller('feature-requests')
export class FeatureRequestController {
  constructor(private readonly featureRequestService: FeatureRequestService) {}

  @Post()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new feature request' })
  @ApiResponse({ status: 201, description: 'The feature request has been successfully created.', type: FeatureRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createFeatureRequestDto: CreateFeatureRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<FeatureRequestResponseDto> {
    return this.featureRequestService.create(req.user!.id, createFeatureRequestDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all feature requests' })
  @ApiQuery({ name: 'status', required: false, enum: FeatureRequestStatus })
  @ApiResponse({ status: 200, description: 'Return all feature requests.', type: [FeatureRequestResponseDto] })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ): Promise<FeatureRequestResponseDto[]> {
    // Pass the current customer ID to check upvote status
    const customerId = req.user?.id;
    return this.featureRequestService.findAll(status, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a feature request by ID' })
  @ApiResponse({ status: 200, description: 'Return the feature request.', type: FeatureRequestResponseDto })
  @ApiResponse({ status: 404, description: 'Feature request not found.' })
  async findOne(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<FeatureRequestResponseDto> {
    // If the user is authenticated, pass their ID to check if they've upvoted
    const customerId = req.user?.id;
    return this.featureRequestService.findOne(id, customerId);
  }

  @Patch(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a feature request' })
  @ApiResponse({ status: 200, description: 'The feature request has been successfully updated.', type: FeatureRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Feature request not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateFeatureRequestDto: UpdateFeatureRequestDto,
  ): Promise<FeatureRequestResponseDto> {
    return this.featureRequestService.update(id, updateFeatureRequestDto);
  }

  @Delete(':id')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a feature request' })
  @ApiResponse({ status: 200, description: 'The feature request has been successfully deleted.', type: FeatureRequestResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Feature request not found.' })
  async remove(@Param('id') id: string): Promise<FeatureRequestResponseDto> {
    return this.featureRequestService.remove(id);
  }

  @Post(':id/upvote')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvote a feature request' })
  @ApiResponse({ status: 201, description: 'The feature request has been successfully upvoted.', type: UpvoteFeatureRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Feature request not found.' })
  async upvote(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<UpvoteFeatureRequestResponseDto> {
    return this.featureRequestService.upvote(id, req.user!.id);
  }

  @Delete(':id/upvote')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an upvote from a feature request' })
  @ApiResponse({ status: 200, description: 'The upvote has been successfully removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Upvote not found.' })
  async removeUpvote(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.featureRequestService.removeUpvote(id, req.user!.id);
  }
}
