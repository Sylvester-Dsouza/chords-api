import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('test-notifications')
  @ApiOperation({ summary: 'Test notifications endpoint' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  testNotifications(): any {
    console.log('🔔 Test notifications endpoint called');
    return { message: 'Test notifications endpoint working', timestamp: new Date().toISOString() };
  }
}
