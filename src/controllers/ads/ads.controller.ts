import { Controller, Post, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdsService } from '../../services/ads.service';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post(':customerId/remove')
  @ApiOperation({ summary: 'Remove ads for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Ads have been removed for the customer.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @HttpCode(HttpStatus.OK)
  removeAds(@Param('customerId') customerId: string): Promise<any> {
    return this.adsService.removeAds(customerId);
  }

  @Post(':customerId/restore')
  @ApiOperation({ summary: 'Restore ads for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Ads have been restored for the customer.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @HttpCode(HttpStatus.OK)
  restoreAds(@Param('customerId') customerId: string): Promise<any> {
    return this.adsService.restoreAds(customerId);
  }

  @Get(':customerId/status')
  @ApiOperation({ summary: 'Check if a customer has ads removed' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Return whether the customer has ads removed.', type: Boolean })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  hasAdsRemoved(@Param('customerId') customerId: string): Promise<boolean> {
    return this.adsService.hasAdsRemoved(customerId);
  }
}
