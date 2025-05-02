import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto
} from '../dto/subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    try {
      // Check if customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: createSubscriptionDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${createSubscriptionDto.customerId} not found`);
      }

      // Check if plan exists and is active
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: createSubscriptionDto.planId },
      });

      if (!plan) {
        throw new NotFoundException(`Subscription plan with ID ${createSubscriptionDto.planId} not found`);
      }

      if (!plan.isActive) {
        throw new BadRequestException(`Subscription plan with ID ${createSubscriptionDto.planId} is not active`);
      }

      // Check if customer already has an active subscription
      const activeSubscription = await this.prisma.subscription.findFirst({
        where: {
          customerId: createSubscriptionDto.customerId,
          status: 'ACTIVE',
        },
      });

      if (activeSubscription) {
        throw new BadRequestException(`Customer already has an active subscription. Please cancel the existing subscription first.`);
      }

      // Create the subscription
      const subscription = await this.prisma.subscription.create({
        data: {
          ...createSubscriptionDto,
          status: createSubscriptionDto.status || SubscriptionStatus.ACTIVE,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              billingCycle: true,
            },
          },
        },
      });

      // Update customer subscription type
      await this.prisma.customer.update({
        where: { id: createSubscriptionDto.customerId },
        data: { subscriptionType: 'PREMIUM' },
      });

      // Convert null to undefined for nullable fields
      return {
        ...subscription,
        endDate: subscription.endDate || undefined,
        canceledAt: subscription.canceledAt || undefined,
        cancelReason: subscription.cancelReason || undefined,
        paymentMethod: subscription.paymentMethod || undefined,
        paymentMethodId: subscription.paymentMethodId || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to create subscription: ${errorMessage}`);
    }
  }

  async findAll(
    status?: string,
    planId?: string,
    customerId?: string,
  ): Promise<SubscriptionResponseDto[]> {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
          },
        },
      },
    });

    // Convert null to undefined for nullable fields
    return subscriptions.map((sub) => ({
      ...sub,
      endDate: sub.endDate || undefined,
      canceledAt: sub.canceledAt || undefined,
      cancelReason: sub.cancelReason || undefined,
      paymentMethod: sub.paymentMethod || undefined,
      paymentMethodId: sub.paymentMethodId || undefined,
    }));
  }

  async findOne(id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    // Convert null to undefined for nullable fields
    return {
      ...subscription,
      endDate: subscription.endDate || undefined,
      canceledAt: subscription.canceledAt || undefined,
      cancelReason: subscription.cancelReason || undefined,
      paymentMethod: subscription.paymentMethod || undefined,
      paymentMethodId: subscription.paymentMethodId || undefined,
    };
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    try {
      // Check if subscription exists
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!existingSubscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      // If plan is being updated, check if it exists and is active
      if (updateSubscriptionDto.planId) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
          where: { id: updateSubscriptionDto.planId },
        });

        if (!plan) {
          throw new NotFoundException(`Subscription plan with ID ${updateSubscriptionDto.planId} not found`);
        }

        if (!plan.isActive) {
          throw new BadRequestException(`Subscription plan with ID ${updateSubscriptionDto.planId} is not active`);
        }
      }

      // Update the subscription
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id },
        data: updateSubscriptionDto,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              billingCycle: true,
            },
          },
        },
      });

      // Convert null to undefined for nullable fields
      return {
        ...updatedSubscription,
        endDate: updatedSubscription.endDate || undefined,
        canceledAt: updatedSubscription.canceledAt || undefined,
        cancelReason: updatedSubscription.cancelReason || undefined,
        paymentMethod: updatedSubscription.paymentMethod || undefined,
        paymentMethodId: updatedSubscription.paymentMethodId || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to update subscription: ${errorMessage}`);
    }
  }

  async cancel(id: string, cancelSubscriptionDto: CancelSubscriptionDto): Promise<SubscriptionResponseDto> {
    try {
      // Check if subscription exists
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!existingSubscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      if (existingSubscription.status === SubscriptionStatus.CANCELED) {
        throw new BadRequestException(`Subscription is already canceled`);
      }

      // Calculate end date if not provided
      const endDate = cancelSubscriptionDto.endDate || existingSubscription.renewalDate;

      // Update the subscription
      const canceledSubscription = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason: cancelSubscriptionDto.cancelReason,
          endDate,
          isAutoRenew: false,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              billingCycle: true,
            },
          },
        },
      });

      // Update customer subscription type if immediate cancellation
      if (new Date() >= endDate) {
        await this.prisma.customer.update({
          where: { id: existingSubscription.customerId },
          data: { subscriptionType: 'FREE' },
        });
      }

      // Convert null to undefined for nullable fields
      return {
        ...canceledSubscription,
        endDate: canceledSubscription.endDate || undefined,
        canceledAt: canceledSubscription.canceledAt || undefined,
        cancelReason: canceledSubscription.cancelReason || undefined,
        paymentMethod: canceledSubscription.paymentMethod || undefined,
        paymentMethodId: canceledSubscription.paymentMethodId || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to cancel subscription: ${errorMessage}`);
    }
  }

  async remove(id: string): Promise<SubscriptionResponseDto> {
    try {
      // Check if subscription exists
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!existingSubscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      // Delete the subscription
      const deletedSubscription = await this.prisma.subscription.delete({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              billingCycle: true,
            },
          },
        },
      });

      // Update customer subscription type
      await this.prisma.customer.update({
        where: { id: existingSubscription.customerId },
        data: { subscriptionType: 'FREE' },
      });

      // Convert null to undefined for nullable fields
      return {
        ...deletedSubscription,
        endDate: deletedSubscription.endDate || undefined,
        canceledAt: deletedSubscription.canceledAt || undefined,
        cancelReason: deletedSubscription.cancelReason || undefined,
        paymentMethod: deletedSubscription.paymentMethod || undefined,
        paymentMethodId: deletedSubscription.paymentMethodId || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete subscription: ${errorMessage}`);
    }
  }

  async getCustomerActiveSubscription(customerId: string): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        customerId,
        status: 'ACTIVE',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingCycle: true,
          },
        },
      },
    });

    // Convert null to undefined for nullable fields if subscription exists
    if (subscription) {
      return {
        ...subscription,
        endDate: subscription.endDate || undefined,
        canceledAt: subscription.canceledAt || undefined,
        cancelReason: subscription.cancelReason || undefined,
        paymentMethod: subscription.paymentMethod || undefined,
        paymentMethodId: subscription.paymentMethodId || undefined,
      };
    }

    return subscription;
  }

  async renewSubscription(id: string): Promise<SubscriptionResponseDto> {
    try {
      // Check if subscription exists
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
        },
      });

      if (!existingSubscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      if (existingSubscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException(`Only active subscriptions can be renewed`);
      }

      // Calculate new renewal date based on billing cycle
      const currentRenewalDate = new Date(existingSubscription.renewalDate);
      let newRenewalDate = new Date(currentRenewalDate);

      switch (existingSubscription.plan.billingCycle) {
        case 'MONTHLY':
          newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          newRenewalDate.setMonth(newRenewalDate.getMonth() + 3);
          break;
        case 'ANNUAL':
          newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
          break;
        case 'LIFETIME':
          // For lifetime plans, set a far future date
          newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 100);
          break;
      }

      // Update the subscription
      const renewedSubscription = await this.prisma.subscription.update({
        where: { id },
        data: {
          renewalDate: newRenewalDate,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              billingCycle: true,
            },
          },
        },
      });

      // Convert null to undefined for nullable fields
      return {
        ...renewedSubscription,
        endDate: renewedSubscription.endDate || undefined,
        canceledAt: renewedSubscription.canceledAt || undefined,
        cancelReason: renewedSubscription.cancelReason || undefined,
        paymentMethod: renewedSubscription.paymentMethod || undefined,
        paymentMethodId: renewedSubscription.paymentMethodId || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to renew subscription: ${errorMessage}`);
    }
  }
}
