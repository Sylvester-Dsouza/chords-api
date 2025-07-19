import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TimezoneService } from '../services/timezone.service';
import { CustomerAuthGuard } from '../guards/customer-auth.guard';

@ApiTags('timezones')
@Controller('timezones')
export class TimezoneController {
  constructor(private readonly timezoneService: TimezoneService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available timezones' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of timezone names',
    schema: {
      type: 'object',
      properties: {
        timezones: {
          type: 'array',
          items: { type: 'string' }
        },
        count: { type: 'number' },
        cached: { type: 'boolean' }
      }
    }
  })
  async getTimezones() {
    const timezones = await this.timezoneService.getTimezones();
    const stats = this.timezoneService.getCacheStats();
    
    return {
      timezones,
      count: timezones.length,
      cached: stats.cached,
      expiresIn: stats.expiresIn
    };
  }

  @Post('clear-cache')
  @UseGuards(CustomerAuthGuard)
  @ApiOperation({ summary: 'Clear timezone cache (admin only)' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    await this.timezoneService.clearCache();
    return { message: 'Timezone cache cleared successfully' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get timezone cache statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache statistics',
    schema: {
      type: 'object',
      properties: {
        cached: { type: 'boolean' },
        expiresIn: { type: 'number' },
        count: { type: 'number' }
      }
    }
  })
  getCacheStats() {
    return this.timezoneService.getCacheStats();
  }
}
