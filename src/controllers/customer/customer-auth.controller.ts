import { Controller, Get, Post, Patch, Delete, Body, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from '../../services/customer-auth.service';
// Firebase handles authentication, no need for bcrypt
import { Request } from 'express';
import { CustomerAuthGuard } from '../../guards/customer-auth.guard';
import { CustomerResponseDto, UpdateCustomerDto, ChangePasswordDto } from '../../dto/customer.dto';
import { FirebaseAuthDto } from '../../dto/auth.dto';
import { admin, isFirebaseInitialized } from '../../config/firebase.config';
import { AuthProvider } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('customer-auth')
@Controller('customers')
@ApiBearerAuth()
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer with Firebase token' })
  @ApiResponse({ status: 201, description: 'Customer registered successfully', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() firebaseAuthDto: FirebaseAuthDto): Promise<any> {
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

        // Check if customer already exists by Firebase UID
        let customer = await this.customerAuthService.prismaService.customer.findUnique({
          where: { firebaseUid: decodedToken.uid },
        });

        // If found by Firebase UID, return error
        if (customer) {
          throw new HttpException('Customer already exists with this account', HttpStatus.BAD_REQUEST);
        }

        // Check if customer already exists by email
        if (decodedToken.email) {
          customer = await this.customerAuthService.prismaService.customer.findUnique({
            where: { email: decodedToken.email },
          });

          // If found by email, return error
          if (customer) {
            throw new HttpException('Customer already exists with this email', HttpStatus.BAD_REQUEST);
          }
        }

        // Determine auth provider
        let authProvider = 'EMAIL' as AuthProvider;
        if (firebaseAuthDto.authProvider) {
          switch (firebaseAuthDto.authProvider.toUpperCase()) {
            case 'GOOGLE':
              authProvider = 'GOOGLE' as AuthProvider;
              break;
            case 'FACEBOOK':
              authProvider = 'FACEBOOK' as AuthProvider;
              break;
            case 'APPLE':
              authProvider = 'APPLE' as AuthProvider;
              break;
            default:
              authProvider = 'EMAIL' as AuthProvider;
          }
        }

        // Create new customer
        customer = await this.customerAuthService.prismaService.customer.create({
          data: {
            email: decodedToken.email || '',
            name: decodedToken.name || firebaseAuthDto.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User'),
            firebaseUid: decodedToken.uid,
            isEmailVerified: decodedToken.email_verified || false,
            authProvider,
            isActive: true,
            rememberMe: firebaseAuthDto.rememberMe || false,
            termsAccepted: true,
            termsAcceptedAt: new Date(),
          },
        });

        // Generate JWT tokens
        const { accessToken, refreshToken } = await this.customerAuthService.generateTokens(customer, firebaseAuthDto.rememberMe);

        // Return customer data and tokens
        return {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            profilePicture: customer.profilePicture,
            phoneNumber: customer.phoneNumber,
            subscriptionType: customer.subscriptionType,
            isActive: customer.isActive,
            isEmailVerified: customer.isEmailVerified,
            lastLoginAt: customer.lastLoginAt,
            authProvider: customer.authProvider,
            rememberMe: customer.rememberMe,
            termsAccepted: customer.termsAccepted,
            termsAcceptedAt: customer.termsAcceptedAt,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
          },
          accessToken,
          refreshToken,
          message: 'Registration successful',
        };
      } catch (error) {
        console.error('Firebase token verification error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new HttpException(
          `Registration failed: ${errorMessage}`,
          HttpStatus.UNAUTHORIZED
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Firebase registration error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('social-login')
  @ApiOperation({ summary: 'Authenticate customer with social login (Google, Facebook, Apple)' })
  @ApiResponse({ status: 200, description: 'Social login successful', type: CustomerResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async socialLogin(@Body() firebaseAuthDto: FirebaseAuthDto): Promise<any> {
    try {
      // Use firebaseToken or idToken (for compatibility)
      const token = firebaseAuthDto.firebaseToken || firebaseAuthDto.idToken;

      if (!token) {
        throw new HttpException('Firebase token is required', HttpStatus.BAD_REQUEST);
      }

      if (!isFirebaseInitialized) {
        throw new HttpException('Firebase is not initialized', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Validate that this is actually a social login
      if (!firebaseAuthDto.authProvider ||
          (firebaseAuthDto.authProvider.toUpperCase() !== 'GOOGLE' &&
           firebaseAuthDto.authProvider.toUpperCase() !== 'FACEBOOK' &&
           firebaseAuthDto.authProvider.toUpperCase() !== 'APPLE')) {
        throw new HttpException('Invalid auth provider for social login', HttpStatus.BAD_REQUEST);
      }

      try {
        // Verify the Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Try to find customer by Firebase UID
        let customer = await this.customerAuthService.prismaService.customer.findUnique({
          where: { firebaseUid: decodedToken.uid },
        });

        // If not found by Firebase UID, try by email
        if (!customer && decodedToken.email) {
          customer = await this.customerAuthService.prismaService.customer.findUnique({
            where: { email: decodedToken.email },
          });

          // If found by email but no Firebase UID, update the customer with Firebase UID
          if (customer && !customer.firebaseUid) {
            customer = await this.customerAuthService.prismaService.customer.update({
              where: { id: customer.id },
              data: { firebaseUid: decodedToken.uid },
            });
          }
        }

        // If customer still not found, create a new one
        if (!customer && decodedToken.email) {
          // Determine auth provider
          let authProvider = 'EMAIL' as AuthProvider;
          if (firebaseAuthDto.authProvider) {
            switch (firebaseAuthDto.authProvider.toUpperCase()) {
              case 'GOOGLE':
                authProvider = 'GOOGLE' as AuthProvider;
                break;
              case 'FACEBOOK':
                authProvider = 'FACEBOOK' as AuthProvider;
                break;
              case 'APPLE':
                authProvider = 'APPLE' as AuthProvider;
                break;
              default:
                authProvider = 'EMAIL' as AuthProvider;
            }
          }

          // Create new customer
          customer = await this.customerAuthService.prismaService.customer.create({
            data: {
              email: decodedToken.email,
              name: decodedToken.name || firebaseAuthDto.name || decodedToken.email.split('@')[0],
              firebaseUid: decodedToken.uid,
              isEmailVerified: decodedToken.email_verified || false,
              authProvider,
              isActive: true,
              rememberMe: firebaseAuthDto.rememberMe || false,
              termsAccepted: true,
              termsAcceptedAt: new Date(),
            },
          });
        }

        if (!customer) {
          throw new HttpException('Failed to find or create customer account', HttpStatus.NOT_FOUND);
        }

        // Check if customer is active
        if (!customer.isActive) {
          throw new HttpException('Customer account is inactive', HttpStatus.UNAUTHORIZED);
        }

        // Update last login time
        await this.customerAuthService.prismaService.customer.update({
          where: { id: customer.id },
          data: {
            lastLoginAt: new Date(),
            rememberMe: firebaseAuthDto.rememberMe || false,
          },
        });

        // Generate JWT tokens
        const { accessToken, refreshToken } = await this.customerAuthService.generateTokens(customer, firebaseAuthDto.rememberMe);

        // Return customer data and tokens
        return {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            profilePicture: customer.profilePicture,
            phoneNumber: customer.phoneNumber,
            subscriptionType: customer.subscriptionType,
            isActive: customer.isActive,
            isEmailVerified: customer.isEmailVerified,
            lastLoginAt: customer.lastLoginAt,
            authProvider: customer.authProvider,
            rememberMe: customer.rememberMe,
            termsAccepted: customer.termsAccepted,
            termsAcceptedAt: customer.termsAcceptedAt,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
          },
          accessToken,
          refreshToken,
          message: 'Social authentication successful',
        };
      } catch (error) {
        console.error('Firebase token verification error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new HttpException(
          `Social authentication failed: ${errorMessage}`,
          HttpStatus.UNAUTHORIZED
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Social authentication error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate customer with Firebase token' })
  @ApiResponse({ status: 200, description: 'Customer authentication successful', type: CustomerResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() firebaseAuthDto: FirebaseAuthDto): Promise<any> {
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

        // Try to find customer by Firebase UID
        let customer = await this.customerAuthService.prismaService.customer.findUnique({
          where: { firebaseUid: decodedToken.uid },
        });

        // If not found by Firebase UID, try by email
        if (!customer && decodedToken.email) {
          customer = await this.customerAuthService.prismaService.customer.findUnique({
            where: { email: decodedToken.email },
          });

          // If found by email but no Firebase UID, update the customer with Firebase UID
          if (customer && !customer.firebaseUid) {
            customer = await this.customerAuthService.prismaService.customer.update({
              where: { id: customer.id },
              data: { firebaseUid: decodedToken.uid },
            });
          }
        }

        // If customer still not found, create a new one
        if (!customer && decodedToken.email) {
          // Determine auth provider
          let authProvider = 'EMAIL' as AuthProvider;
          if (firebaseAuthDto.authProvider) {
            switch (firebaseAuthDto.authProvider.toUpperCase()) {
              case 'GOOGLE':
                authProvider = 'GOOGLE' as AuthProvider;
                break;
              case 'FACEBOOK':
                authProvider = 'FACEBOOK' as AuthProvider;
                break;
              case 'APPLE':
                authProvider = 'APPLE' as AuthProvider;
                break;
              default:
                authProvider = 'EMAIL' as AuthProvider;
            }
          }

          // Create new customer
          customer = await this.customerAuthService.prismaService.customer.create({
            data: {
              email: decodedToken.email,
              name: decodedToken.name || firebaseAuthDto.name || decodedToken.email.split('@')[0],
              firebaseUid: decodedToken.uid,
              isEmailVerified: decodedToken.email_verified || false,
              authProvider,
              isActive: true,
              rememberMe: firebaseAuthDto.rememberMe || false,
              termsAccepted: true,
              termsAcceptedAt: new Date(),
            },
          });
        }

        if (!customer) {
          throw new HttpException('Failed to find or create customer account', HttpStatus.NOT_FOUND);
        }

        // Check if customer is active
        if (!customer.isActive) {
          throw new HttpException('Customer account is inactive', HttpStatus.UNAUTHORIZED);
        }

        // Update last login time
        await this.customerAuthService.prismaService.customer.update({
          where: { id: customer.id },
          data: {
            lastLoginAt: new Date(),
            rememberMe: firebaseAuthDto.rememberMe || false,
          },
        });

        // Generate JWT tokens
        const { accessToken, refreshToken } = await this.customerAuthService.generateTokens(customer, firebaseAuthDto.rememberMe);

        // Return customer data and tokens
        return {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            profilePicture: customer.profilePicture,
            phoneNumber: customer.phoneNumber,
            subscriptionType: customer.subscriptionType,
            isActive: customer.isActive,
            isEmailVerified: customer.isEmailVerified,
            lastLoginAt: customer.lastLoginAt,
            authProvider: customer.authProvider,
            rememberMe: customer.rememberMe,
            termsAccepted: customer.termsAccepted,
            termsAcceptedAt: customer.termsAcceptedAt,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
          },
          accessToken,
          refreshToken,
          message: 'Authentication successful',
        };
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
      console.error('Firebase authentication error:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('me')
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

  @Patch('me')
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

  @Patch('me/password')
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

  @Delete('me')
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
