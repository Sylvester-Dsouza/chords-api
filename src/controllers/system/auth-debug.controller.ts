import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserAuthGuard } from '../../guards/user-auth.guard';

@ApiTags('debug')
@Controller('debug/auth')
export class AuthDebugController {
  @Get()
  @ApiOperation({ summary: 'Debug authentication' })
  @ApiResponse({ status: 200, description: 'Returns debug information about the request' })
  async debugAuth(@Req() request: any) {
    // Return basic request information without authentication
    return {
      message: 'Auth debug endpoint (no auth required)',
      path: request.path,
      method: request.method,
      headers: request.headers,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('protected')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug authenticated request' })
  @ApiResponse({ status: 200, description: 'Returns debug information about the authenticated request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async debugAuthProtected(@Req() request: any) {
    return {
      message: 'Auth debug endpoint (auth required)',
      path: request.path,
      method: request.method,
      user: request.user,
      timestamp: new Date().toISOString(),
    };
  }
}
