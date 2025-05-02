import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SubscriptionService } from '../../services/subscription.service';
import { 
  CreateSubscriptionDto, 
  UpdateSubscriptionDto, 
  CancelSubscriptionDto,
  SubscriptionResponseDto 
} from '../../dto/subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'The subscription has been successfully created.', type: SubscriptionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Customer or plan not found.' })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by subscription status' })
  @ApiQuery({ name: 'planId', required: false, description: 'Filter by plan ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiResponse({ status: 200, description: 'Return all subscriptions.', type: [SubscriptionResponseDto] })
  findAll(
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('customerId') customerId?: string,
  ): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionService.findAll(status, planId, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by id' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Return the subscription.', type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  findOne(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'The subscription has been successfully updated.', type: SubscriptionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'The subscription has been successfully canceled.', type: SubscriptionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  cancel(@Param('id') id: string, @Body() cancelSubscriptionDto: CancelSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancel(id, cancelSubscriptionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'The subscription has been successfully deleted.', type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  remove(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.remove(id);
  }

  @Get('customer/:customerId/active')
  @ApiOperation({ summary: 'Get active subscription for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return the active subscription for the customer.', type: SubscriptionResponseDto })
  getCustomerActiveSubscription(@Param('customerId') customerId: string): Promise<SubscriptionResponseDto | null> {
    return this.subscriptionService.getCustomerActiveSubscription(customerId);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'The subscription has been successfully renewed.', type: SubscriptionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  renew(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.renewSubscription(id);
  }
}
