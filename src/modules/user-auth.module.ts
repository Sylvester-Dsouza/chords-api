import { Module } from '@nestjs/common';
import { UserAuthController } from '../controllers/user/user-auth.controller';
import { UserService } from '../services/user.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [UserAuthController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserAuthModule {}
