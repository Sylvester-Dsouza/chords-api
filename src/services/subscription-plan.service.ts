import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, SubscriptionPlanResponseDto } from '../dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    try {
      // Check if plan with the same name already exists
      const existingPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { name: createSubscriptionPlanDto.name },
      });

      if (existingPlan) {
        throw new BadRequestException(`Subscription plan with name '${createSubscriptionPlanDto.name}' already exists`);
      }

      // Create the subscription plan
      const plan = await this.prisma.subscriptionPlan.create({
        data: createSubscriptionPlanDto,
      });

      // Convert null to undefined for description and color
      return {
        ...plan,
        description: plan.description || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to create subscription plan: ${errorMessage}`);
    }
  }

  async findAll(includeInactive = false): Promise<SubscriptionPlanResponseDto[]> {
    const where = includeInactive ? {} : { isActive: true };

    const plans = await this.prisma.subscriptionPlan.findMany({
      where,
      orderBy: {
        price: 'asc',
      },
    });

    // Get subscriber counts and revenue for each plan
    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        const subscriptions = await this.prisma.subscription.findMany({
          where: {
            planId: plan.id,
            status: 'ACTIVE',
          },
        });

        const subscriberCount = subscriptions.length;

        // Calculate revenue based on billing cycle
        let revenue = 0;
        subscriptions.forEach(sub => {
          revenue += plan.price;
        });

        return {
          ...plan,
          subscriberCount,
          revenue,
        };
      })
    );

    // Convert null to undefined for description in each plan
    return plansWithStats.map(plan => ({
      ...plan,
      description: plan.description || undefined,
    }));
  }

  async findOne(id: string): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    // Get subscriber count and revenue
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        planId: plan.id,
        status: 'ACTIVE',
      },
    });

    const subscriberCount = subscriptions.length;

    // Calculate revenue based on billing cycle
    let revenue = 0;
    subscriptions.forEach(sub => {
      revenue += plan.price;
    });

    // Convert null to undefined for description
    return {
      ...plan,
      description: plan.description || undefined,
      subscriberCount,
      revenue,
    };
  }

  async update(id: string, updateSubscriptionPlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    try {
      // Check if plan exists
      const existingPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new NotFoundException(`Subscription plan with ID ${id} not found`);
      }

      // If name is being updated, check if it's unique
      if (updateSubscriptionPlanDto.name && updateSubscriptionPlanDto.name !== existingPlan.name) {
        const planWithSameName = await this.prisma.subscriptionPlan.findUnique({
          where: { name: updateSubscriptionPlanDto.name },
        });

        if (planWithSameName) {
          throw new BadRequestException(`Subscription plan with name '${updateSubscriptionPlanDto.name}' already exists`);
        }
      }

      // Update the subscription plan
      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: updateSubscriptionPlanDto,
      });

      // Convert null to undefined for description
      return {
        ...updatedPlan,
        description: updatedPlan.description || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to update subscription plan: ${errorMessage}`);
    }
  }

  async remove(id: string): Promise<SubscriptionPlanResponseDto> {
    try {
      // Check if plan exists
      const existingPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new NotFoundException(`Subscription plan with ID ${id} not found`);
      }

      // Check if plan has active subscriptions
      const activeSubscriptions = await this.prisma.subscription.findMany({
        where: {
          planId: id,
          status: 'ACTIVE',
        },
      });

      if (activeSubscriptions.length > 0) {
        throw new BadRequestException(`Cannot delete plan with active subscriptions. Deactivate the plan instead.`);
      }

      // Delete the subscription plan
      const deletedPlan = await this.prisma.subscriptionPlan.delete({
        where: { id },
      });

      // Convert null to undefined for description
      return {
        ...deletedPlan,
        description: deletedPlan.description || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete subscription plan: ${errorMessage}`);
    }
  }

  async toggleActive(id: string, isActive: boolean): Promise<SubscriptionPlanResponseDto> {
    try {
      // Check if plan exists
      const existingPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new NotFoundException(`Subscription plan with ID ${id} not found`);
      }

      // Update the active status
      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive },
      });

      // Convert null to undefined for description
      return {
        ...updatedPlan,
        description: updatedPlan.description || undefined,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to update subscription plan status: ${errorMessage}`);
    }
  }
}
