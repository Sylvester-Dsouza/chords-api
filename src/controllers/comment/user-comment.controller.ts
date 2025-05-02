import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService } from '../../services/comment.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RequestWithUser } from '../../interfaces/request-with-user.interface';
import { UnauthorizedException } from '@nestjs/common';

@ApiTags('user-comments')
@Controller('user/comments')
@UseGuards(UserAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN) // Only allow SUPER_ADMIN to access these endpoints
@ApiBearerAuth()
export class UserCommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all comments with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Return filtered comments with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a SUPER_ADMIN' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('songId') songId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('isDeleted') isDeleted?: boolean,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.commentService.findAllWithFilters({
      page,
      limit,
      songId,
      customerId,
      search,
      isDeleted: isDeleted !== undefined ? isDeleted : undefined,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Return comment statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a SUPER_ADMIN' })
  async getStats() {
    return this.commentService.getCommentStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a comment by ID with details (admin only)' })
  @ApiResponse({ status: 200, description: 'Return the comment with details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async findOne(@Param('id') id: string) {
    return this.commentService.findOneWithDetails(id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a comment as admin' })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async replyToComment(
    @Param('id') id: string,
    @Body('text') text: string,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    // Create a reply as the admin user
    const comment = await this.commentService.findOne(id);
    return this.commentService.create(req.user.id, {
      songId: comment.songId,
      text,
      parentId: id,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment (admin only)' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(@Param('id') id: string) {
    // Admin can delete any comment
    return this.commentService.adminDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted comment (admin only)' })
  @ApiResponse({ status: 200, description: 'Comment restored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async restore(@Param('id') id: string) {
    return this.commentService.adminRestore(id);
  }
}