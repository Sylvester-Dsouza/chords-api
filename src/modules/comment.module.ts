import { Module } from '@nestjs/common';
import { CommentController } from '../controllers/comment/comment.controller';
import { UserCommentController } from '../controllers/comment/user-comment.controller';
import { CommentService } from '../services/comment.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [CommentController, UserCommentController],
  providers: [CommentService, PrismaService],
  exports: [CommentService],
})
export class CommentModule {}
