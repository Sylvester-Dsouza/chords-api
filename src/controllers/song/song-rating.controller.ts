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
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { SongRatingService } from '../../services/song-rating.service';
import {
  CreateSongRatingDto,
  UpdateSongRatingDto,
  SongRatingResponseDto,
  SongRatingStatsDto,
} from '../../dto/song-rating.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Define the Request with User interface
interface RequestWithUser {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

// Define query parameters for getting all ratings
class GetAllRatingsQuery {
  @ApiProperty({ required: false, description: 'Filter by song ID' })
  @IsOptional()
  songId?: string;

  @ApiProperty({ required: false, description: 'Filter by customer ID' })
  @IsOptional()
  customerId?: string;

  @ApiProperty({ required: false, description: 'Minimum rating value (1-5)' })
  @IsOptional()
  minRating?: number;

  @ApiProperty({ required: false, description: 'Maximum rating value (1-5)' })
  @IsOptional()
  maxRating?: number;

  @ApiProperty({ required: false, description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Page number', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Number of items per page', default: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Sort by field', enum: ['createdAt', 'rating'] })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, description: 'General search term' })
  @IsOptional()
  search?: string;
}

// Define response for paginated ratings
class PaginatedRatingsResponse {
  @ApiProperty({ type: [SongRatingResponseDto] })
  data!: SongRatingResponseDto[];

  @ApiProperty({ description: 'Total number of ratings' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;
}

@ApiTags('song-ratings')
@Controller('song-ratings')
export class SongRatingController {
  constructor(private readonly songRatingService: SongRatingService) {}

  @Get('debug')
  @ApiOperation({ summary: 'Debug endpoint to check if the API is working' })
  @ApiResponse({ status: 200, description: 'Return debug information.' })
  async debug() {
    return {
      message: 'Song ratings API is working correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all ratings with pagination and filtering (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Return paginated ratings.', type: PaginatedRatingsResponse })
  async getAllRatingsPublic(@Query() query: GetAllRatingsQuery): Promise<PaginatedRatingsResponse> {
    try {
      console.log('GET /song-ratings/public - Received query:', query);

      const {
        page = 1,
        limit = 10,
        songId,
        customerId,
        minRating,
        maxRating,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      // Convert string parameters to appropriate types
      const parsedPage = parseInt(page.toString(), 10);
      const parsedLimit = parseInt(limit.toString(), 10);
      const parsedMinRating = minRating ? parseInt(minRating.toString(), 10) : undefined;
      const parsedMaxRating = maxRating ? parseInt(maxRating.toString(), 10) : undefined;

      console.log('Parsed query parameters:', {
        page: parsedPage,
        limit: parsedLimit,
        songId,
        customerId,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });

      // Get ratings with pagination and filtering
      const result = await this.songRatingService.findAll({
        page: parsedPage,
        limit: parsedLimit,
        songId,
        customerId,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });

      console.log(`Found ${result.total} ratings, returning page ${parsedPage} with ${result.data.length} items`);

      return {
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
      };
    } catch (error) {
      console.error('Error in getAllRatingsPublic:', error);
      throw error;
    }
  }

  @Get()
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings with pagination and filtering (admin only)' })
  @ApiResponse({ status: 200, description: 'Return paginated ratings.', type: PaginatedRatingsResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllRatings(@Query() query: GetAllRatingsQuery): Promise<PaginatedRatingsResponse> {
    try {
      console.log('GET /song-ratings - Received query:', query);

      const {
        page = 1,
        limit = 10,
        songId,
        customerId,
        minRating,
        maxRating,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      // Convert string parameters to appropriate types
      const parsedPage = parseInt(page.toString(), 10);
      const parsedLimit = parseInt(limit.toString(), 10);
      const parsedMinRating = minRating ? parseInt(minRating.toString(), 10) : undefined;
      const parsedMaxRating = maxRating ? parseInt(maxRating.toString(), 10) : undefined;

      console.log('Parsed query parameters:', {
        page: parsedPage,
        limit: parsedLimit,
        songId,
        customerId,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });

      // Get ratings with pagination and filtering
      const result = await this.songRatingService.findAll({
        page: parsedPage,
        limit: parsedLimit,
        songId,
        customerId,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });

      console.log(`Found ${result.total} ratings, returning page ${parsedPage} with ${result.data.length} items`);

      return {
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
      };
    } catch (error) {
      console.error('Error in getAllRatings:', error);
      throw error;
    }
  }

  @Post()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a song or update existing rating' })
  @ApiResponse({ status: 201, description: 'The song has been successfully rated.', type: SongRatingResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async rateSong(
    @Body() createSongRatingDto: CreateSongRatingDto,
    @Req() req: RequestWithUser,
  ): Promise<SongRatingResponseDto> {
    return this.songRatingService.rateOrUpdate(req.user.id, createSongRatingDto);
  }

  @Get('songs/:songId')
  @ApiOperation({ summary: 'Get all ratings for a song' })
  @ApiResponse({ status: 200, description: 'Return all ratings for the song.', type: [SongRatingResponseDto] })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async findAllForSong(@Param('songId') songId: string): Promise<SongRatingResponseDto[]> {
    return this.songRatingService.findAllForSong(songId);
  }

  @Get('songs/:songId/stats')
  @ApiOperation({ summary: 'Get rating statistics for a song' })
  @ApiResponse({ status: 200, description: 'Return rating statistics for the song.', type: SongRatingStatsDto })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async getStats(@Param('songId') songId: string): Promise<SongRatingStatsDto> {
    return this.songRatingService.getStats(songId);
  }

  @Get('songs/:songId/my-rating')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current customer's rating for a song" })
  @ApiResponse({ status: 200, description: "Return the customer's rating for the song.", type: SongRatingResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Rating not found.' })
  async getMyRating(
    @Param('songId') songId: string,
    @Req() req: RequestWithUser,
  ): Promise<SongRatingResponseDto> {
    const rating = await this.songRatingService.findByCustomerAndSong(req.user.id, songId);
    if (!rating) {
      throw new NotFoundException(`You have not rated this song yet`);
    }
    return rating;
  }

  @Get('customers/:customerId')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings by a customer (admin only)' })
  @ApiResponse({ status: 200, description: 'Return all ratings by the customer.', type: [SongRatingResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAllByCustomer(@Param('customerId') customerId: string): Promise<SongRatingResponseDto[]> {
    return this.songRatingService.findAllByCustomer(customerId);
  }

  @Get('my-ratings')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all of the current customer's ratings" })
  @ApiResponse({ status: 200, description: "Return all of the customer's ratings.", type: [SongRatingResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyRatings(@Req() req: RequestWithUser): Promise<SongRatingResponseDto[]> {
    return this.songRatingService.findAllByCustomer(req.user.id);
  }

  @Get('stats')
  @UseGuards(UserAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get global rating statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Return global rating statistics.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getGlobalStats() {
    try {
      console.log('GET /song-ratings/stats - Fetching global stats');

      const totalRatings = await this.songRatingService.countAll();
      console.log(`Total ratings: ${totalRatings}`);

      const averageRating = await this.songRatingService.getGlobalAverageRating();
      console.log(`Average rating: ${averageRating}`);

      const highestRatedSongs = await this.songRatingService.getHighestRatedSongs(5);
      console.log(`Highest rated songs: ${highestRatedSongs.length}`);

      const response = {
        totalRatings,
        averageRating,
        highestRatedSongs,
      };

      console.log('Returning stats response:', response);

      return response;
    } catch (error) {
      console.error('Error in getGlobalStats:', error);
      throw error;
    }
  }

  @Get('public-stats')
  @ApiOperation({ summary: 'Get global rating statistics (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Return global rating statistics.' })
  async getGlobalStatsPublic() {
    try {
      console.log('GET /song-ratings/public-stats - Fetching global stats');

      const totalRatings = await this.songRatingService.countAll();
      console.log(`Total ratings: ${totalRatings}`);

      const averageRating = await this.songRatingService.getGlobalAverageRating();
      console.log(`Average rating: ${averageRating}`);

      const highestRatedSongs = await this.songRatingService.getHighestRatedSongs(5);
      console.log(`Highest rated songs: ${highestRatedSongs.length}`);

      const response = {
        totalRatings,
        averageRating,
        highestRatedSongs,
      };

      console.log('Returning public stats response:', response);

      return response;
    } catch (error) {
      console.error('Error in getGlobalStatsPublic:', error);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rating by ID' })
  @ApiResponse({ status: 200, description: 'Return the rating.', type: SongRatingResponseDto })
  @ApiResponse({ status: 404, description: 'Rating not found.' })
  async findOne(@Param('id') id: string): Promise<SongRatingResponseDto> {
    return this.songRatingService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a rating' })
  @ApiResponse({ status: 200, description: 'The rating has been successfully updated.', type: SongRatingResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Rating not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSongRatingDto: UpdateSongRatingDto,
    @Req() req: RequestWithUser,
  ): Promise<SongRatingResponseDto> {
    return this.songRatingService.update(id, req.user.id, updateSongRatingDto);
  }

  @Delete(':id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a rating' })
  @ApiResponse({ status: 200, description: 'The rating has been successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Rating not found.' })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.songRatingService.remove(id, req.user.id);
  }
}
