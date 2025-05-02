import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateFirebaseUserDto } from './dto/create-firebase-user.dto';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';
import { PrismaService } from '../services/prisma.service';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  async createFirebaseUser(createFirebaseUserDto: CreateFirebaseUserDto) {
    try {
      // Check if Firebase is initialized
      if (!admin.apps.length) {
        throw new HttpException(
          'Firebase admin is not initialized',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Create the user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: createFirebaseUserDto.email,
        password: createFirebaseUserDto.password,
        displayName: createFirebaseUserDto.displayName,
        disabled: false,
      });

      // Return the Firebase user record (without sensitive information)
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        disabled: userRecord.disabled,
        emailVerified: userRecord.emailVerified,
        createdAt: userRecord.metadata.creationTime,
      };
    } catch (error: unknown) {
      // Define a type guard for Firebase Auth errors
      interface FirebaseAuthError {
        code?: string;
        message?: string;
      }

      // Check if error is a Firebase Auth error
      const isFirebaseAuthError = (err: unknown): err is FirebaseAuthError => {
        return typeof err === 'object' && err !== null && 'code' in err;
      };

      // Handle Firebase-specific errors
      if (isFirebaseAuthError(error)) {
        if (error.code === 'auth/email-already-exists') {
          throw new HttpException(
            'The email address is already in use by another account',
            HttpStatus.BAD_REQUEST,
          );
        } else if (error.code === 'auth/invalid-email') {
          throw new HttpException(
            'The email address is not valid',
            HttpStatus.BAD_REQUEST,
          );
        } else if (error.code === 'auth/weak-password') {
          throw new HttpException(
            'The password must be at least 6 characters long',
            HttpStatus.BAD_REQUEST,
          );
        }

        // For other Firebase errors with a message
        if (error.message) {
          throw new HttpException(
            error.message,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // For other errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Firebase user';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async authenticateWithFirebase(firebaseAuthDto: FirebaseAuthDto) {
    try {
      // Use the token from either field
      const token = firebaseAuthDto.firebaseToken || firebaseAuthDto.idToken;

      if (!token) {
        throw new HttpException('Firebase token is required', HttpStatus.BAD_REQUEST);
      }

      // Check if Firebase is initialized
      if (!admin.apps.length) {
        throw new HttpException(
          'Firebase admin is not initialized',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Verify the Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);

      if (!decodedToken.uid) {
        throw new HttpException('Invalid Firebase token', HttpStatus.UNAUTHORIZED);
      }

      // Get the user from Firebase
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);

      // Check if user exists in our database
      let customer = await this.prisma.customer.findFirst({
        where: {
          firebaseUid: decodedToken.uid,
        },
        select: {
          id: true,
          name: true,
          email: true,
          firebaseUid: true,
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

      // If user doesn't exist, create a new one
      if (!customer) {
        // Check if email already exists
        if (firebaseUser.email) {
          const existingCustomer = await this.prisma.customer.findUnique({
            where: {
              email: firebaseUser.email,
            },
            select: {
              id: true,
              name: true,
              email: true,
              firebaseUid: true,
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

          if (existingCustomer) {
            // Update existing customer with Firebase UID
            customer = await this.prisma.customer.update({
              where: {
                id: existingCustomer.id,
              },
              data: {
                firebaseUid: decodedToken.uid,
                authProvider: this.mapAuthProvider(firebaseAuthDto.authProvider),
                lastLoginAt: new Date(),
                isEmailVerified: firebaseUser.emailVerified,
              },
              select: {
                id: true,
                name: true,
                email: true,
                firebaseUid: true,
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
          }
        }

        // If still no customer, create a new one
        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              name: firebaseAuthDto.name || firebaseUser.displayName || 'User',
              email: firebaseUser.email || `${decodedToken.uid}@example.com`,
              firebaseUid: decodedToken.uid,
              authProvider: this.mapAuthProvider(firebaseAuthDto.authProvider),
              isEmailVerified: firebaseUser.emailVerified,
              lastLoginAt: new Date(),
              profilePicture: firebaseUser.photoURL,
              phoneNumber: firebaseUser.phoneNumber,
              termsAccepted: true,
              termsAcceptedAt: new Date(),
            },
            select: {
              id: true,
              name: true,
              email: true,
              firebaseUid: true,
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
        }
      } else {
        // Update last login time
        customer = await this.prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            lastLoginAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            firebaseUid: true,
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
      }

      // Generate JWT token for our API
      // For simplicity, we'll just return a mock token
      const accessToken = `mock_access_token_${customer.id}`;
      const refreshToken = `mock_refresh_token_${customer.id}`;

      return {
        customer,
        accessToken,
        refreshToken,
        message: 'Authentication successful',
      };
    } catch (error: unknown) {
      // Define a type guard for Firebase Auth errors
      interface FirebaseAuthError {
        code?: string;
        message?: string;
      }

      // Check if error is a Firebase Auth error
      const isFirebaseAuthError = (err: unknown): err is FirebaseAuthError => {
        return typeof err === 'object' && err !== null && 'code' in err;
      };

      // Handle Firebase-specific errors
      if (isFirebaseAuthError(error)) {
        if (error.code === 'auth/id-token-expired') {
          throw new HttpException(
            'Firebase token has expired',
            HttpStatus.UNAUTHORIZED,
          );
        } else if (error.code === 'auth/invalid-id-token') {
          throw new HttpException(
            'Invalid Firebase token',
            HttpStatus.UNAUTHORIZED,
          );
        }

        // For other Firebase errors with a message
        if (error.message) {
          throw new HttpException(
            error.message,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // For other errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with Firebase';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to map auth provider string to enum
  private mapAuthProvider(provider: string): AuthProvider {
    switch (provider.toUpperCase()) {
      case 'GOOGLE':
        return AuthProvider.GOOGLE;
      case 'FACEBOOK':
        return AuthProvider.FACEBOOK;
      case 'APPLE':
        return AuthProvider.APPLE;
      case 'EMAIL':
      default:
        return AuthProvider.EMAIL;
    }
  }
}
