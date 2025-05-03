import { Module } from '@nestjs/common';
import { UserAuthController } from '../controllers/user/user-auth.controller';
import { UserService } from '../services/user.service';
import { PrismaService } from '../services/prisma.service';
import { UploadModule } from './upload.module';
import { UserAuthGuard } from '../guards/user-auth.guard';

@Module({
  imports: [UploadModule],
  controllers: [UserAuthController],
  providers: [UserService, PrismaService, UserAuthGuard],
  exports: [UserService, UserAuthGuard],
})
export class UserAuthModule {}
