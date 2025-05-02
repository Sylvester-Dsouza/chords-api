import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Song ID' })
  @IsUUID()
  songId!: string;

  @ApiProperty({ example: 'This song is amazing!', description: 'Comment text' })
  @IsString()
  text!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Parent comment ID (for replies)',
    required: false
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: 'This song is amazing!', description: 'Updated comment text' })
  @IsString()
  text!: string;
}

export enum CommentModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED'
}

export class CommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id!: string;

  @ApiProperty({ description: 'Song ID' })
  songId!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Comment text' })
  text!: string;

  @ApiProperty({ description: 'Parent comment ID (for replies)', required: false })
  parentId?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Whether the comment is deleted' })
  isDeleted!: boolean;

  @ApiProperty({ description: 'Deletion timestamp', required: false })
  deletedAt?: Date | null;

  @ApiProperty({ enum: CommentModerationStatus, description: 'Moderation status of the comment' })
  moderationStatus!: CommentModerationStatus;

  @ApiProperty({ description: 'When the comment was moderated', required: false })
  moderatedAt?: Date | null;

  @ApiProperty({ description: 'ID of the admin who moderated the comment', required: false })
  moderatedById?: string | null;

  @ApiProperty({ description: 'Reason for moderation decision', required: false })
  moderationReason?: string | null;

  @ApiProperty({ description: 'Admin who moderated the comment', required: false })
  moderatedBy?: {
    id: string;
    name: string;
  } | null;

  @ApiProperty({ description: 'Customer information' })
  customer?: {
    id: string;
    name: string;
    profilePicture?: string | null;
  };

  @ApiProperty({ description: 'Number of likes' })
  likesCount?: number;

  @ApiProperty({ description: 'Whether the current user has liked this comment' })
  isLiked?: boolean;

  @ApiProperty({ description: 'Replies to this comment', type: [CommentResponseDto] })
  replies?: CommentResponseDto[];
}

export class CommentLikeResponseDto {
  @ApiProperty({ description: 'Comment like ID' })
  id!: string;

  @ApiProperty({ description: 'Comment ID' })
  commentId!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;
}
