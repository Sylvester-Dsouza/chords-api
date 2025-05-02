import { Controller, Post, Get, Body, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../../services/user.service';
import { Request } from 'express';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { admin, isFirebaseInitialized } from '../../config/firebase.config';
import { FirebaseAuthDto } from '../../dto/auth.dto';
import { UserResponseDto } from '../../dto/user.dto';
import { UserRole } from '../../dto/user.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@ApiTags('user-auth')
@Controller('auth/admin')
export class UserAuthController {
  constructor(private readonly userService: UserService) {}

  @Post('firebase')
  @ApiOperation({ summary: 'Authenticate admin user with Firebase token' })
  @ApiResponse({ status: 200, description: 'Admin authentication successful', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async firebaseAuth(@Body() firebaseAuthDto: FirebaseAuthDto): Promise<UserResponseDto> {
    try {
      // Use firebaseToken or idToken (for compatibility)
      const token = firebaseAuthDto.firebaseToken || firebaseAuthDto.idToken;

      if (!token) {
        throw new HttpException('Firebase token is required', HttpStatus.BAD_REQUEST);
      }

      if (!isFirebaseInitialized) {
        throw new HttpException('Firebase is not initialized', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      try {
        // Verify the Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Try to find user by Firebase UID
        let user = await this.userService.findByFirebaseUid(decodedToken.uid);

        // If not found by Firebase UID, try by email
        if (!user && decodedToken.email) {
          user = await this.userService.findByEmail(decodedToken.email);

          // If found by email but no Firebase UID, update the user with Firebase UID
          if (user && !user.firebaseUid) {
            user = await this.userService.updateFirebaseUid(user.id, decodedToken.uid);
          }
        }

        if (!user) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        // Check if user is active
        if (!user.isActive) {
          throw new HttpException('User account is inactive', HttpStatus.UNAUTHORIZED);
        }

        // Check if user has admin role
        if (
          user.role !== UserRole.SUPER_ADMIN &&
          user.role !== UserRole.ADMIN &&
          user.role !== UserRole.CONTRIBUTOR
        ) {
          throw new HttpException('User does not have admin privileges', HttpStatus.UNAUTHORIZED);
        }

        // Update last login time
        await this.userService.updateLastLogin(user.id);

        return user;
      } catch (error) {
        console.error('Firebase token verification error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new HttpException(
          `Authentication failed: ${errorMessage}`,
          HttpStatus.UNAUTHORIZED
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Admin Firebase auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Authentication failed: ${errorMessage}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Get('me')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin user profile' })
  @ApiResponse({ status: 200, description: 'Admin user profile', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: RequestWithUser): Promise<UserResponseDto> {
    try {
      const userId = req.user.id;
      const user = await this.userService.findOne(userId);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if user has admin role
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.CONTRIBUTOR
      ) {
        throw new HttpException('User does not have admin privileges', HttpStatus.UNAUTHORIZED);
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Get current admin user error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
