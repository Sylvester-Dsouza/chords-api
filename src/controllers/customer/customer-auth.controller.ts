import { Controller, Get, Patch, Delete, Body, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from '../../services/customer-auth.service';
// Firebase handles authentication, no need for bcrypt
import { Request } from 'express';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { CustomerResponseDto, UpdateCustomerDto, ChangePasswordDto } from '../../dto/customer.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('customer-profile')
@Controller('customers/me')
@ApiBearerAuth()
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Get()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: CustomerResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: RequestWithUser): Promise<CustomerResponseDto> {
    try {
      const userId = req.user.id;
      const user = await this.customerAuthService.findById(userId);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Get current user error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Req() req: RequestWithUser, @Body() updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    try {
      const userId = req.user.id;
      const { name, profilePicture, phoneNumber } = updateCustomerDto;

      // Update user
      const updatedUser = await this.customerAuthService.prismaService.customer.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(profilePicture !== undefined && { profilePicture }),
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          profilePicture: true,
          phoneNumber: true,
          subscriptionType: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          authProvider: true,
          rememberMe: true,
          termsAccepted: true,
          termsAcceptedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser as CustomerResponseDto;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Update profile error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('password')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(@Req() req: RequestWithUser, @Body() _changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    try {
      const userId = req.user.id;
      // Firebase handles password changes, we don't need the passwords here

      // Get user with password
      const user = await this.customerAuthService.prismaService.customer.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Since we're using Firebase for authentication, we need to update the password in Firebase
      try {
        // Check if user has a Firebase UID
        if (!user.firebaseUid) {
          throw new HttpException('Cannot change password for this account', HttpStatus.BAD_REQUEST);
        }

        // For security reasons, we should redirect the user to Firebase password reset flow
        // Here we're just returning a message to guide the user
        return {
          message: 'Please use the Firebase password reset flow to change your password'
        };

        // Note: In a real implementation, you might want to use Firebase Admin SDK to update the password
        // or send a password reset email to the user
        // Example: await admin.auth().updateUser(user.firebaseUid, { password: newPassword });
      } catch (firebaseError) {
        console.error('Firebase password update error:', firebaseError);
        throw new HttpException('Failed to update password', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Change password error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete()
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Req() req: RequestWithUser): Promise<{ message: string }> {
    try {
      const userId = req.user.id;

      // Delete user
      await this.customerAuthService.prismaService.customer.delete({
        where: { id: userId },
      });

      return { message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Delete account error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
