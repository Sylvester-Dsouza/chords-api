import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsBoolean, IsEmail, IsEnum, IsInt, Min } from 'class-validator';
import { SongResponseDto } from './song.dto';

export class CreateSetlistDto {
  @ApiProperty({ example: 'Sunday Morning Worship', description: 'Setlist name' })
  @IsString()
  name: string = '';

  @ApiProperty({ example: 'Songs for Sunday morning worship service', description: 'Setlist description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSetlistDto {
  @ApiProperty({ example: 'Sunday Morning Worship', description: 'Setlist name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Songs for Sunday morning worship service', description: 'Setlist description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddSongToSetlistDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId: string = '';
}

export class AddMultipleSongsToSetlistDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001'],
    description: 'Array of Song IDs to add to setlist'
  })
  @IsArray()
  @IsUUID('4', { each: true })
  songIds: string[] = [];
}

export class ReorderSetlistSongsDto {
  @ApiProperty({
    description: 'Array of song IDs in the desired order',
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001', '323e4567-e89b-12d3-a456-426614174002']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  songIds: string[] = [];
}

export class SetlistResponseDto {
  @ApiProperty({ description: 'Setlist ID' })
  id: string = '';

  @ApiProperty({ example: 'Sunday Morning Worship', description: 'Setlist name' })
  name: string = '';

  @ApiProperty({ example: 'Songs for Sunday morning worship service', description: 'Setlist description' })
  description?: string | null = null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Customer ID' })
  customerId: string = '';

  @ApiProperty({ description: 'Songs in the setlist', type: [SongResponseDto] })
  songs?: SongResponseDto[] = [];

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Creation date' })
  createdAt: Date = new Date();

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Last update date' })
  updatedAt: Date = new Date();

  @ApiProperty({ description: 'Whether setlist is publicly visible' })
  isPublic?: boolean = false;

  @ApiProperty({ description: 'Whether setlist is shared with others' })
  isShared?: boolean = false;

  @ApiProperty({ description: 'Unique share code for the setlist' })
  shareCode?: string | null = null;

  @ApiProperty({ description: 'Whether collaborators can edit' })
  allowEditing?: boolean = false;

  @ApiProperty({ description: 'Whether collaborators can comment' })
  allowComments?: boolean = true;

  @ApiProperty({ description: 'Version number for conflict resolution' })
  version?: number = 1;

  @ApiProperty({ description: 'Collaborators with access to this setlist' })
  collaborators?: SetlistCollaboratorResponseDto[] = [];

  @ApiProperty({ description: 'Recent activities on this setlist' })
  activities?: SetlistActivityResponseDto[] = [];

  @ApiProperty({ description: 'Comments on this setlist' })
  comments?: SetlistCommentResponseDto[] = [];
}

// Collaborative setlist DTOs
export class ShareSetlistDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email of user to share with' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ enum: ['VIEW', 'EDIT', 'ADMIN'], description: 'Permission level for the collaborator' })
  @IsEnum(['VIEW', 'EDIT', 'ADMIN'])
  permission: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW';

  @ApiProperty({ example: 'Check out this setlist for Sunday service', description: 'Optional message to include' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class UpdateCollaboratorDto {
  @ApiProperty({ enum: ['VIEW', 'EDIT', 'ADMIN'], description: 'New permission level' })
  @IsEnum(['VIEW', 'EDIT', 'ADMIN'])
  permission: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW';
}

export class SetlistSettingsDto {
  @ApiProperty({ description: 'Whether setlist is publicly visible' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ description: 'Whether collaborators can edit' })
  @IsBoolean()
  @IsOptional()
  allowEditing?: boolean;

  @ApiProperty({ description: 'Whether collaborators can comment' })
  @IsBoolean()
  @IsOptional()
  allowComments?: boolean;
}

export class CreateSetlistCommentDto {
  @ApiProperty({ example: 'Great selection for worship!', description: 'Comment text' })
  @IsString()
  text: string = '';

  @ApiProperty({ description: 'Parent comment ID for replies' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class SetlistSyncDto {
  @ApiProperty({ description: 'Current version of the setlist' })
  @IsInt()
  @Min(1)
  version: number = 1;

  @ApiProperty({ description: 'Last sync timestamp' })
  @IsOptional()
  lastSyncAt?: Date;

  @ApiProperty({ description: 'Changes to sync' })
  @IsOptional()
  changes?: any;
}

// Response DTOs
export class SetlistCollaboratorResponseDto {
  @ApiProperty({ description: 'Collaborator ID' })
  id: string = '';

  @ApiProperty({ description: 'Customer information' })
  customer: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  } = { id: '', name: '', email: '' };

  @ApiProperty({ enum: ['VIEW', 'EDIT', 'ADMIN'], description: 'Permission level' })
  permission: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW';

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED'], description: 'Collaboration status' })
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED' = 'PENDING';

  @ApiProperty({ description: 'When the invitation was sent' })
  invitedAt: Date = new Date();

  @ApiProperty({ description: 'When the invitation was accepted' })
  acceptedAt?: Date | null = null;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActiveAt?: Date | null = null;
}

export class SetlistActivityResponseDto {
  @ApiProperty({ description: 'Activity ID' })
  id: string = '';

  @ApiProperty({ description: 'Customer who performed the action' })
  customer: {
    id: string;
    name: string;
    profilePicture?: string;
  } = { id: '', name: '' };

  @ApiProperty({ description: 'Action performed' })
  action: string = '';

  @ApiProperty({ description: 'Additional details about the action' })
  details?: any = null;

  @ApiProperty({ description: 'When the action occurred' })
  timestamp: Date = new Date();

  @ApiProperty({ description: 'Setlist version when action occurred' })
  version: number = 1;
}

export class SetlistCommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string = '';

  @ApiProperty({ description: 'Customer who made the comment' })
  customer: {
    id: string;
    name: string;
    profilePicture?: string;
  } = { id: '', name: '' };

  @ApiProperty({ description: 'Comment text' })
  text: string = '';

  @ApiProperty({ description: 'Parent comment ID for replies' })
  parentId?: string | null = null;

  @ApiProperty({ description: 'Replies to this comment' })
  replies?: SetlistCommentResponseDto[] = [];

  @ApiProperty({ description: 'When the comment was created' })
  createdAt: Date = new Date();

  @ApiProperty({ description: 'When the comment was last updated' })
  updatedAt: Date = new Date();
}
