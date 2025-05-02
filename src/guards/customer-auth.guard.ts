import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../services/prisma.service';
import { admin, isFirebaseInitialized } from '../config/firebase.config';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
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

      // First, check if this is a custom token (mock_access_token_*)
      if (token.startsWith('mock_access_token_')) {
        try {
          // Extract customer ID from token
          const customerId = token.replace('mock_access_token_', '');

          // Find customer by ID
          const customer = await this.prismaService.customer.findUnique({
            where: { id: customerId },
          });

          if (!customer) {
            throw new UnauthorizedException('Customer not found in database');
          }

          // Check if customer is active
          if (!customer.isActive) {
            throw new UnauthorizedException('Account is inactive');
          }

          // Attach customer to request
          request.user = {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            firebaseUid: customer.firebaseUid,
            // Include other customer properties as needed
            profilePicture: customer.profilePicture,
            phoneNumber: customer.phoneNumber,
            subscriptionType: customer.subscriptionType,
            isEmailVerified: customer.isEmailVerified,
            lastLoginAt: customer.lastLoginAt,
            termsAccepted: customer.termsAccepted,
            termsAcceptedAt: customer.termsAcceptedAt
          };

          return true;
        } catch (error) {
          console.error('Custom token verification error:', error);
          throw new UnauthorizedException('Invalid custom token');
        }
      } else {
        // Try to verify as Firebase token
        try {
          const decodedFirebaseToken = await admin.auth().verifyIdToken(token);

          // Find customer by Firebase UID
          const customer = await this.prismaService.customer.findUnique({
            where: { firebaseUid: decodedFirebaseToken.uid },
          });

          // If customer doesn't exist in our database but has a valid Firebase token,
          // we could optionally create the customer here
          if (!customer) {
            throw new UnauthorizedException('Customer not found in database');
          }

          // Check if customer is active
          if (!customer.isActive) {
            throw new UnauthorizedException('Account is inactive');
          }

          // Attach customer to request
          request.user = {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            firebaseUid: customer.firebaseUid,
            // Include other customer properties as needed
            profilePicture: customer.profilePicture,
            phoneNumber: customer.phoneNumber,
            subscriptionType: customer.subscriptionType,
            isEmailVerified: customer.isEmailVerified,
            lastLoginAt: customer.lastLoginAt,
            termsAccepted: customer.termsAccepted,
            termsAcceptedAt: customer.termsAcceptedAt
          };
        } catch (firebaseError) {
          console.error('Firebase token verification error:', firebaseError);
          throw new UnauthorizedException('Invalid Firebase token');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Auth guard error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
