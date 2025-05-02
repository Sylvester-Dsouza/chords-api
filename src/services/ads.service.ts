import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Remove ads for a customer
   * @param customerId The customer ID
   * @returns The updated customer
   */
  async removeAds(customerId: string): Promise<any> {
    try {
      // Check if customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Check if customer already has ads removed
      // Use type assertion to access the showAds property
      const customerWithAds = customer as unknown as { showAds: boolean };
      if (!customerWithAds.showAds) {
        throw new BadRequestException('Ads are already removed for this customer');
      }

      // Check if customer has an active subscription
      const activeSubscription = await this.subscriptionService.getCustomerActiveSubscription(customerId);

      if (!activeSubscription) {
        throw new BadRequestException('Customer must have an active subscription to remove ads');
      }

      if (activeSubscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException('Customer must have an active subscription to remove ads');
      }

      // Update customer to remove ads
      // Use Prisma's raw update to set the showAds field
      await this.prisma.$executeRaw`
        UPDATE "Customer"
        SET "showAds" = false
        WHERE "id" = ${customerId}
      `;

      // Fetch the updated customer
      const updatedCustomer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      return updatedCustomer;
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to remove ads: ${errorMessage}`);
    }
  }

  /**
   * Restore ads for a customer
   * @param customerId The customer ID
   * @returns The updated customer
   */
  async restoreAds(customerId: string): Promise<any> {
    try {
      // Check if customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Check if customer already has ads showing
      // Use type assertion to access the showAds property
      const customerWithAds = customer as unknown as { showAds: boolean };
      if (customerWithAds.showAds) {
        throw new BadRequestException('Ads are already enabled for this customer');
      }

      // Update customer to restore ads
      // Use Prisma's raw update to set the showAds field
      await this.prisma.$executeRaw`
        UPDATE "Customer"
        SET "showAds" = true
        WHERE "id" = ${customerId}
      `;

      // Fetch the updated customer
      const updatedCustomer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      return updatedCustomer;
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to restore ads: ${errorMessage}`);
    }
  }

  /**
   * Check if a customer has ads removed
   * @param customerId The customer ID
   * @returns Whether the customer has ads removed
   */
  async hasAdsRemoved(customerId: string): Promise<boolean> {
    try {
      // Check if customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Use type assertion to access the showAds property
      const customerWithAds = customer as unknown as { showAds: boolean };
      return !customerWithAds.showAds;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to check ads status: ${errorMessage}`);
    }
  }
}
