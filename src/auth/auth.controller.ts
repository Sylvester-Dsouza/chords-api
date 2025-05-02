import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateFirebaseUserDto } from './dto/create-firebase-user.dto';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-firebase-user')
  @ApiOperation({ summary: 'Create a new Firebase user' })
  @ApiResponse({ status: 201, description: 'Firebase user created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CreateFirebaseUserDto })
  async createFirebaseUser(@Body() createFirebaseUserDto: CreateFirebaseUserDto) {
    try {
      const result = await this.authService.createFirebaseUser(createFirebaseUserDto);
      return result;
    } catch (error: unknown) {
      // Handle error with proper type checking
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Firebase user';
      const errorStatus = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;

      throw new HttpException(errorMessage, errorStatus);
    }
  }

  @Post('firebase')
  @ApiOperation({ summary: 'Authenticate with Firebase token' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: FirebaseAuthDto })
  async firebaseAuth(@Body() firebaseAuthDto: FirebaseAuthDto) {
    try {
      const result = await this.authService.authenticateWithFirebase(firebaseAuthDto);
      return result;
    } catch (error: unknown) {
      // Handle error with proper type checking
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with Firebase';
      const errorStatus = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;

      throw new HttpException(errorMessage, errorStatus);
    }
  }
}
