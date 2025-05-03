import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../services/prisma.service';
import { admin, isFirebaseInitialized } from '../config/firebase.config';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  private async validateRequest(request: any): Promise<boolean> {
    console.log('UserAuthGuard - Validating request for path:', request.path);
    console.log('UserAuthGuard - Request headers:', request.headers);

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('UserAuthGuard - No valid Authorization header found');
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      console.log('UserAuthGuard - No token found in Authorization header');
      throw new UnauthorizedException('Authentication required');
    }

    console.log('UserAuthGuard - Token found, length:', token.length);
    // Log first 10 chars of token for debugging (don't log full token for security)
    console.log('UserAuthGuard - Token preview:', token.substring(0, 10) + '...');

    try {
      // Check if Firebase is available
      if (!isFirebaseInitialized()) {
        throw new UnauthorizedException('Firebase authentication is not available');
      }

      // Verify Firebase token
      try {
        console.log('UserAuthGuard - Verifying Firebase token...');
        const decodedFirebaseToken = await admin.auth().verifyIdToken(token);
        console.log('UserAuthGuard - Token verified successfully. UID:', decodedFirebaseToken.uid);
        console.log('UserAuthGuard - Token claims:', JSON.stringify(decodedFirebaseToken, null, 2));

        // Find admin user by Firebase UID
        console.log('UserAuthGuard - Finding user by Firebase UID:', decodedFirebaseToken.uid);
        const user = await this.prismaService.user.findUnique({
          where: { firebaseUid: decodedFirebaseToken.uid },
        });

        if (!user) {
          console.log('UserAuthGuard - No user found with Firebase UID:', decodedFirebaseToken.uid);
          throw new UnauthorizedException('Admin user not found');
        }

        console.log('UserAuthGuard - User found:', user.id, user.email, user.role);

        // Check if user is active
        if (!user.isActive) {
          console.log('UserAuthGuard - User is inactive:', user.id);
          throw new UnauthorizedException('Account is inactive');
        }

        // Check if user has admin role
        if (
          user.role !== UserRole.SUPER_ADMIN &&
          user.role !== UserRole.ADMIN &&
          user.role !== UserRole.CONTRIBUTOR
        ) {
          console.warn(`UserAuthGuard - User ${user.id} with role ${user.role} attempted to access admin endpoint`);
          throw new UnauthorizedException('Insufficient permissions');
        }

        // Log successful authentication
        console.log(`UserAuthGuard - User ${user.id} with role ${user.role} successfully authenticated`);

        // Attach user to request
        request.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          firebaseUid: user.firebaseUid,
        };

        console.log('UserAuthGuard - User attached to request:', request.user);
      } catch (firebaseError) {
        console.error('UserAuthGuard - Firebase token verification error:', firebaseError);
        if (firebaseError instanceof Error) {
          console.error('UserAuthGuard - Error message:', firebaseError.message);
          console.error('UserAuthGuard - Error stack:', firebaseError.stack);
        }
        throw new UnauthorizedException('Invalid Firebase token');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        // Just rethrow the specific unauthorized exception
        throw error;
      }

      console.error('UserAuthGuard - General auth guard error:', error);
      if (error instanceof Error) {
        console.error('UserAuthGuard - Error message:', error.message);
        console.error('UserAuthGuard - Error stack:', error.stack);
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
