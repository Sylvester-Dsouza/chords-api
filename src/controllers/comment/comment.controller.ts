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
import { CommentService } from '../../services/comment.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
  CommentLikeResponseDto,
} from '../../dto/comment.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RequestWithUser } from '../../interfaces/request-with-user.interface';
import { Public } from '../../decorators/public.decorator';

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully created.', type: CommentResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: RequestWithUser,
  ): Promise<CommentResponseDto> {
    // User is guaranteed to exist because of CustomerAuthGuard
    return this.commentService.create(req.user!.id, createCommentDto);
  }

  @Get('song/:songId')
  @Public()
  @ApiOperation({ summary: 'Get all comments for a song' })
  @ApiResponse({ status: 200, description: 'Return all comments for a song.', type: [CommentResponseDto] })
  @ApiResponse({ status: 404, description: 'Song not found.' })
  async findAllForSong(
    @Param('songId') songId: string,
    @Req() req: RequestWithUser,
  ): Promise<CommentResponseDto[]> {
    const customerId = req.user?.id; // Optional, may be undefined for public access
    return this.commentService.findAllForSong(songId, customerId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a comment by ID' })
  @ApiResponse({ status: 200, description: 'Return the comment.', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<CommentResponseDto> {
    const customerId = req.user?.id; // Optional, may be undefined for public access
    return this.commentService.findOne(id, customerId);
  }

  @Patch(':id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully updated.', type: CommentResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: RequestWithUser,
  ): Promise<CommentResponseDto> {
    // User is guaranteed to exist because of CustomerAuthGuard
    return this.commentService.update(id, req.user!.id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment (soft delete)' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully deleted.', type: CommentResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<CommentResponseDto> {
    // User is guaranteed to exist because of CustomerAuthGuard
    return this.commentService.softDelete(id, req.user!.id);
  }

  @Post(':id/like')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a comment' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully liked.', type: CommentLikeResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async likeComment(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<CommentLikeResponseDto> {
    // User is guaranteed to exist because of CustomerAuthGuard
    return this.commentService.likeComment(id, req.user!.id);
  }

  @Delete(':id/like')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully unliked.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async unlikeComment(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    // User is guaranteed to exist because of CustomerAuthGuard
    return this.commentService.unlikeComment(id, req.user!.id);
  }
}
