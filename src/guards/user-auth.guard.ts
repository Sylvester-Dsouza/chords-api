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
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      // Check if Firebase is available
      if (!isFirebaseInitialized()) {
        throw new UnauthorizedException('Firebase authentication is not available');
      }

      // Verify Firebase token
      try {
        const decodedFirebaseToken = await admin.auth().verifyIdToken(token);

        // Find admin user by Firebase UID
        const user = await this.prismaService.user.findUnique({
          where: { firebaseUid: decodedFirebaseToken.uid },
        });

        if (!user) {
          throw new UnauthorizedException('Admin user not found');
        }

        // Check if user is active
        if (!user.isActive) {
          throw new UnauthorizedException('Account is inactive');
        }

        // Check if user has admin role
        if (
          user.role !== UserRole.SUPER_ADMIN &&
          user.role !== UserRole.ADMIN &&
          user.role !== UserRole.CONTRIBUTOR
        ) {
          console.warn(`User ${user.id} with role ${user.role} attempted to access admin endpoint`);
          throw new UnauthorizedException('Insufficient permissions');
        }

        // Log successful authentication
        console.log(`User ${user.id} with role ${user.role} successfully authenticated`);

        // Attach user to request
        request.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          firebaseUid: user.firebaseUid,
        };
      } catch (firebaseError) {
        console.error('Firebase token verification error:', firebaseError);
        throw new UnauthorizedException('Invalid Firebase token');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Admin auth guard error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
