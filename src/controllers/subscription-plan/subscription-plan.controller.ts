import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SubscriptionPlanService } from '../../services/subscription-plan.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, SubscriptionPlanResponseDto } from '../../dto/subscription-plan.dto';

@ApiTags('subscription-plans')
@Controller('subscription-plans')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({ status: 201, description: 'The subscription plan has been successfully created.', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.create(createSubscriptionPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive plans' })
  @ApiResponse({ status: 200, description: 'Return all subscription plans.', type: [SubscriptionPlanResponseDto] })
  findAll(@Query('includeInactive') includeInactive?: boolean): Promise<SubscriptionPlanResponseDto[]> {
    return this.subscriptionPlanService.findAll(includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by id' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'Return the subscription plan.', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription plan not found.' })
  findOne(@Param('id') id: string): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'The subscription plan has been successfully updated.', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found.' })
  update(@Param('id') id: string, @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'The subscription plan has been successfully deleted.', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found.' })
  remove(@Param('id') id: string): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.remove(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle the active status of a subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiQuery({ name: 'isActive', required: true, type: Boolean, description: 'Active status to set' })
  @ApiResponse({ status: 200, description: 'The subscription plan status has been successfully updated.', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found.' })
  toggleActive(
    @Param('id') id: string,
    @Query('isActive') isActive: boolean,
  ): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.toggleActive(id, isActive === true);
  }
}
