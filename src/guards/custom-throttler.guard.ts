import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions, ThrottlerModuleOptions } from '@nestjs/throttler';
import { THROTTLER_SKIP } from '../decorators/skip-throttle.decorator';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector
  ) {
    // Initialize with all required parameters
    super(options, storageService, reflector);
  }

  /**
   * Override the getTracker method to use a more specific key
   * This helps differentiate between different clients better
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Get IP address from various headers and fallbacks
    const ip = 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      'unknown';
    
    // Include user agent to better identify clients
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Create a hash of the user agent to keep the key shorter
    const userAgentHash = Buffer.from(userAgent).toString('base64').substring(0, 10);
    
    // Return a combined key as a Promise
    return Promise.resolve(`${ip}-${userAgentHash}`);
  }

  /**
   * Override the shouldSkip method to check for our custom decorator
   */
  protected async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    // Check if the handler or controller has the skip decorator
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Skip throttling for health check endpoints
    const req = context.switchToHttp().getRequest();
    const isHealthCheck = req.path.includes('/health') || 
                          req.path.includes('/ping');

    return skipThrottle || isHealthCheck || await super.shouldSkip(context);
  }
}
