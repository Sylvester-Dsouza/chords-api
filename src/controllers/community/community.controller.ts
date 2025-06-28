import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommunityService } from '../../services/community.service';
import { CommunitySetlistsResponseDto, CommunitySetlistDto } from '../../dto/community.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('community')
@Controller('community')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('setlists')
  @ApiOperation({ summary: 'Get public community setlists' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of public setlists from the community.', 
    type: CommunitySetlistsResponseDto 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'mostLiked', 'mostViewed'], description: 'Sort order (default: newest)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in setlist names and descriptions' })
  async getCommunitySetlists(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sortBy') sortBy: 'newest' | 'oldest' | 'mostLiked' | 'mostViewed' = 'newest',
    @Query('search') search: string | undefined,
    @Req() req: RequestWithUser
  ): Promise<CommunitySetlistsResponseDto> {
    const customerId = req.user.id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    
    return this.communityService.getCommunitySetlists({
      page: pageNum,
      limit: limitNum,
      sortBy,
      search,
      customerId
    });
  }

  @Get('setlists/trending')
  @ApiOperation({ summary: 'Get trending community setlists' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of trending setlists from the community.', 
    type: CommunitySetlistsResponseDto 
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items to return (default: 10)' })
  async getTrendingSetlists(
    @Query('limit') limit = '10',
    @Req() req: RequestWithUser
  ): Promise<CommunitySetlistsResponseDto> {
    const customerId = req.user.id;
    const limitNum = parseInt(limit, 10) || 10;
    
    return this.communityService.getTrendingSetlists(limitNum, customerId);
  }

  @Get('setlists/my-liked')
  @ApiOperation({ summary: 'Get setlists liked by current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of setlists liked by the current user.', 
    type: CommunitySetlistsResponseDto 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  async getMyLikedSetlists(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: RequestWithUser
  ): Promise<CommunitySetlistsResponseDto> {
    const customerId = req.user.id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    
    return this.communityService.getMyLikedSetlists(customerId, pageNum, limitNum);
  }
}
