import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SetlistService } from '../../services/setlist.service';
import {
  CreateSetlistDto,
  UpdateSetlistDto,
  SetlistResponseDto,
  AddSongToSetlistDto,
  AddMultipleSongsToSetlistDto,
  ReorderSetlistSongsDto,
  ShareSetlistDto,
  UpdateCollaboratorDto,
  SetlistSettingsDto,
  CreateSetlistCommentDto,
  SetlistSyncDto,
  SetlistCollaboratorResponseDto,
  SetlistActivityResponseDto,
  SetlistCommentResponseDto
} from '../../dto/setlist.dto';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// Decorator to skip authentication for specific endpoints
export const SkipAuth = () => SetMetadata('skipAuth', true);

@ApiTags('setlists')
@Controller('setlists')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class SetlistController {
  constructor(private readonly setlistService: SetlistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new setlist' })
  @ApiResponse({ status: 201, description: 'The setlist has been successfully created.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @Body() createSetlistDto: CreateSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.create(customerId, createSetlistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all setlists for the current user with incremental sync support' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO timestamp to get only updated setlists since this time' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of setlists to return' })
  @ApiResponse({ status: 200, description: 'Return all setlists.', type: [SetlistResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ): Promise<SetlistResponseDto[]> {
    const customerId = req.user.id;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.setlistService.findAllByCustomer(customerId, since, limitNum);
  }

  @Get('shared')
  @ApiOperation({ summary: 'Get all setlists shared with the current user' })
  @ApiResponse({ status: 200, description: 'Return shared setlists.', type: [SetlistResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getSharedSetlists(@Req() req: RequestWithUser): Promise<SetlistResponseDto[]> {
    const customerId = req.user.id;
    return this.setlistService.getSharedSetlists(customerId);
  }

  @Get('share/:shareCode')
  @SkipAuth()
  @ApiOperation({ summary: 'Get setlist by share code (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Return setlist details.', type: SetlistResponseDto })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async getByShareCode(
    @Param('shareCode') shareCode: string
  ): Promise<SetlistResponseDto> {
    return this.setlistService.getSetlistByShareCode(shareCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a setlist by ID' })
  @ApiResponse({ status: 200, description: 'Return the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.findOne(id, customerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a setlist' })
  @ApiResponse({ status: 200, description: 'The setlist has been successfully updated.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSetlistDto: UpdateSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.update(id, customerId, updateSetlistDto);
  }

  @Post(':id/songs')
  @ApiOperation({ summary: 'Add a song to a setlist' })
  @ApiResponse({ status: 200, description: 'The song has been successfully added to the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or song not found.' })
  async addSong(
    @Param('id') id: string,
    @Body() addSongDto: AddSongToSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.addSong(id, customerId, addSongDto.songId);
  }

  @Post(':id/songs/bulk')
  @ApiOperation({ summary: 'Add multiple songs to a setlist' })
  @ApiResponse({ status: 200, description: 'The songs have been successfully added to the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or songs not found.' })
  async addMultipleSongs(
    @Param('id') id: string,
    @Body() addMultipleSongsDto: AddMultipleSongsToSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.addMultipleSongs(id, customerId, addMultipleSongsDto.songIds);
  }

  @Delete(':id/songs/:songId')
  @ApiOperation({ summary: 'Remove a song from a setlist' })
  @ApiResponse({ status: 200, description: 'The song has been successfully removed from the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or song not found.' })
  async removeSong(
    @Param('id') id: string,
    @Param('songId') songId: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.removeSong(id, customerId, songId);
  }

  @Delete(':id/songs/bulk')
  @ApiOperation({ summary: 'Remove multiple songs from a setlist' })
  @ApiResponse({ status: 200, description: 'The songs have been successfully removed from the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or songs not found.' })
  async removeMultipleSongs(
    @Param('id') id: string,
    @Body() removeMultipleSongsDto: AddMultipleSongsToSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.removeMultipleSongs(id, customerId, removeMultipleSongsDto.songIds);
  }

  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Reorder songs in a setlist' })
  @ApiResponse({ status: 200, description: 'The songs have been successfully reordered in the setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async reorderSongs(
    @Param('id') id: string,
    @Body() reorderDto: ReorderSetlistSongsDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.reorderSongs(id, customerId, reorderDto.songIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a setlist' })
  @ApiResponse({ status: 200, description: 'The setlist has been successfully deleted.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.remove(id, customerId);
  }

  // ==================== COLLABORATIVE ENDPOINTS ====================

  @Post(':id/share')
  @ApiOperation({ summary: 'Share a setlist with another user' })
  @ApiResponse({ status: 201, description: 'The setlist has been successfully shared.', type: SetlistCollaboratorResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 409, description: 'Setlist is already shared with this user.' })
  async shareSetlist(
    @Param('id') id: string,
    @Body() shareDto: ShareSetlistDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistCollaboratorResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.shareSetlist(id, customerId, shareDto);
  }

  @Post('accept/:shareCode')
  @ApiOperation({ summary: 'Accept a setlist invitation using share code' })
  @ApiResponse({ status: 200, description: 'The invitation has been accepted.', type: SetlistResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Invalid share code or no pending invitation.' })
  async acceptInvitation(
    @Param('shareCode') shareCode: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.acceptInvitation(shareCode, customerId);
  }

  @Get(':id/collaborators')
  @ApiOperation({ summary: 'Get all collaborators for a setlist' })
  @ApiResponse({ status: 200, description: 'Return all collaborators.', type: [SetlistCollaboratorResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async getCollaborators(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistCollaboratorResponseDto[]> {
    const customerId = req.user.id;
    return this.setlistService.getCollaborators(id, customerId);
  }

  @Patch(':id/collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Update collaborator permissions' })
  @ApiResponse({ status: 200, description: 'The collaborator permissions have been updated.', type: SetlistCollaboratorResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or collaborator not found.' })
  async updateCollaborator(
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() updateDto: UpdateCollaboratorDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistCollaboratorResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.updateCollaborator(id, customerId, collaboratorId, updateDto);
  }

  @Delete(':id/collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Remove a collaborator from a setlist' })
  @ApiResponse({ status: 200, description: 'The collaborator has been removed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist or collaborator not found.' })
  async removeCollaborator(
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: RequestWithUser
  ): Promise<void> {
    const customerId = req.user.id;
    return this.setlistService.removeCollaborator(id, customerId, collaboratorId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get activity log for a setlist' })
  @ApiResponse({ status: 200, description: 'Return activity log.', type: [SetlistActivityResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of activities to return (default: 20)' })
  async getActivities(
    @Param('id') id: string,
    @Query('limit') limit: string = '20',
    @Req() req: RequestWithUser
  ): Promise<SetlistActivityResponseDto[]> {
    const customerId = req.user.id;
    return this.setlistService.getActivities(id, customerId, parseInt(limit));
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a setlist' })
  @ApiResponse({ status: 201, description: 'The comment has been added.', type: SetlistCommentResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async addComment(
    @Param('id') id: string,
    @Body() commentDto: CreateSetlistCommentDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistCommentResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.addComment(id, customerId, commentDto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a setlist' })
  @ApiResponse({ status: 200, description: 'Return comments.', type: [SetlistCommentResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async getComments(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistCommentResponseDto[]> {
    const customerId = req.user.id;
    return this.setlistService.getComments(id, customerId);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync setlist changes for real-time collaboration' })
  @ApiResponse({ status: 200, description: 'Setlist synchronized successfully.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 409, description: 'Conflict - setlist has been modified by another user.' })
  async syncSetlist(
    @Param('id') id: string,
    @Body() syncDto: SetlistSyncDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.syncSetlist(id, customerId, syncDto);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update setlist collaboration settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.', type: SetlistResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async updateSettings(
    @Param('id') id: string,
    @Body() settingsDto: SetlistSettingsDto,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.updateSettings(id, customerId, settingsDto);
  }

  @Post('join/:shareCode')
  @ApiOperation({ summary: 'Join setlist by share code' })
  @ApiResponse({ status: 200, description: 'Successfully joined setlist.', type: SetlistResponseDto })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 409, description: 'Already a member of this setlist.' })
  async joinByShareCode(
    @Param('shareCode') shareCode: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.joinSetlist(shareCode, customerId);
  }

  // Community Setlist Features

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear all setlist caches for the current user' })
  @ApiResponse({ status: 200, description: 'Caches cleared successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async clearCaches(
    @Req() req: RequestWithUser
  ): Promise<{ success: boolean; message: string }> {
    const customerId = req.user.id;
    return this.setlistService.clearUserCaches(customerId);
  }

  @Post(':id/make-public')
  @ApiOperation({ summary: 'Make setlist public for community' })
  @ApiResponse({ status: 200, description: 'Setlist made public successfully.', type: SetlistResponseDto })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 403, description: 'Not authorized to modify this setlist.' })
  async makePublic(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.makePublic(id, customerId);
  }

  @Post(':id/make-private')
  @ApiOperation({ summary: 'Make setlist private (remove from community)' })
  @ApiResponse({ status: 200, description: 'Setlist made private successfully.', type: SetlistResponseDto })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 403, description: 'Not authorized to modify this setlist.' })
  async makePrivate(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<SetlistResponseDto> {
    const customerId = req.user.id;
    return this.setlistService.makePrivate(id, customerId);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a setlist' })
  @ApiResponse({ status: 200, description: 'Setlist liked successfully.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 409, description: 'Already liked this setlist.' })
  async likeSetlist(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<{ success: boolean; likeCount: number }> {
    const customerId = req.user.id;
    return this.setlistService.likeSetlist(id, customerId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a setlist' })
  @ApiResponse({ status: 200, description: 'Setlist unliked successfully.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  @ApiResponse({ status: 409, description: 'Not liked this setlist.' })
  async unlikeSetlist(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<{ success: boolean; likeCount: number }> {
    const customerId = req.user.id;
    return this.setlistService.unlikeSetlist(id, customerId);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment view count for a setlist' })
  @ApiResponse({ status: 200, description: 'View count incremented successfully.' })
  @ApiResponse({ status: 404, description: 'Setlist not found.' })
  async incrementViewCount(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<{ success: boolean; viewCount: number }> {
    const customerId = req.user.id;
    return this.setlistService.incrementViewCount(id, customerId);
  }
}
