import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { RedisService } from '../services/redis.service';
import { SubscriptionType } from '@prisma/client';

export enum RateLimitTier {
  ANONYMOUS = 'anonymous',
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ADMIN = 'admin',
}

interface RateLimitConfig {
  points: number;      // Number of requests allowed
  duration: number;    // Time window in seconds
  blockDuration: number; // How long to block if limit is exceeded (in seconds)
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  // Rate limit configurations for different tiers
  private readonly rateLimits: Record<RateLimitTier, RateLimitConfig> = {
    [RateLimitTier.ANONYMOUS]: { points: 30, duration: 60, blockDuration: 60 },
    [RateLimitTier.FREE]: { points: 60, duration: 60, blockDuration: 30 },
    [RateLimitTier.BASIC]: { points: 120, duration: 60, blockDuration: 0 },
    [RateLimitTier.PREMIUM]: { points: 240, duration: 60, blockDuration: 0 },
    [RateLimitTier.ADMIN]: { points: 1000, duration: 60, blockDuration: 0 },
  };

  // Endpoint sensitivity multipliers (higher = stricter limits)
  private readonly endpointSensitivity: Record<string, number> = {
    '/api/auth': 0.5,        // Auth endpoints get more lenient limits
    '/api/songs': 1,         // Standard limit
    '/api/artists': 1,       // Standard limit
    '/api/comments': 0.7,    // Comments get slightly more lenient limits
    '/api/admin': 0.3,       // Admin endpoints get more lenient limits
    '/api/chord-diagrams': 2, // Chord diagrams get stricter limits
  };

  constructor(private readonly redisService: RedisService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    if (!this.redisService.isReady()) {
      // If Redis is not available, skip rate limiting
      return next();
    }

    try {
      // Determine client identifier (IP or user ID)
      const clientId = this.getClientIdentifier(req);

      // Determine rate limit tier
      const tier = this.getRateLimitTier(req);

      // Determine endpoint path for sensitivity
      const endpoint = this.getEndpointPath(req);

      // Get rate limit config for this tier
      const config = this.rateLimits[tier];

      // Apply endpoint sensitivity multiplier
      const sensitivity = this.getEndpointSensitivity(endpoint);
      const adjustedPoints = Math.max(1, Math.floor(config.points * sensitivity));

      // Create Redis key for this client and endpoint
      const key = `ratelimit:${clientId}:${endpoint}`;

      // Check if client is currently blocked
      const blockKey = `ratelimit:blocked:${clientId}:${endpoint}`;
      const isBlocked = await this.redisService.exists(blockKey);

      if (isBlocked) {
        const ttl = await this.redisService.ttl(blockKey);
        this.logger.warn(`Rate limit exceeded for ${clientId} on ${endpoint} (blocked for ${ttl}s)`);

        // Set rate limit headers
        res.header('X-RateLimit-Limit', adjustedPoints.toString());
        res.header('X-RateLimit-Remaining', '0');
        res.header('X-RateLimit-Reset', ttl.toString());

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Increment request count
      const count = await this.redisService.increment(key, config.duration);

      // Set rate limit headers
      res.header('X-RateLimit-Limit', adjustedPoints.toString());
      res.header('X-RateLimit-Remaining', Math.max(0, adjustedPoints - count).toString());

      const ttl = await this.redisService.ttl(key);
      res.header('X-RateLimit-Reset', ttl.toString());

      // Check if rate limit is exceeded
      if (count > adjustedPoints) {
        // If block duration is set, block the client
        if (config.blockDuration > 0) {
          await this.redisService.set(blockKey, 'blocked', config.blockDuration);
        }

        this.logger.warn(`Rate limit exceeded for ${clientId} on ${endpoint} (${count}/${adjustedPoints})`);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Log high usage
      if (count > adjustedPoints * 0.8) {
        this.logger.debug(`High rate limit usage for ${clientId} on ${endpoint} (${count}/${adjustedPoints})`);
      }

      next();
    } catch (error: any) {
      if (error instanceof HttpException) {
        // Pass through rate limit exceptions
        throw error;
      }

      // Log other errors but don't block the request
      this.logger.error(`Error in rate limit middleware: ${error.message}`);
      next();
    }
  }

  /**
   * Get client identifier (IP address or user ID)
   */
  private getClientIdentifier(req: RequestWithUser): string {
    // If user is authenticated, use their ID
    if (req.user && req.user['id']) {
      return `user:${req.user['id']}`;
    }

    // Otherwise use IP address
    const ip = req.ip ||
               req.socket.remoteAddress ||
               req.headers['x-forwarded-for'] ||
               'unknown';

    return `ip:${ip}`;
  }

  /**
   * Determine rate limit tier based on user subscription
   */
  private getRateLimitTier(req: RequestWithUser): RateLimitTier {
    // If user is authenticated
    if (req.user) {
      // Check if admin
      if (req.user['role'] && ['ADMIN', 'SUPER_ADMIN'].includes(req.user['role'])) {
        return RateLimitTier.ADMIN;
      }

      // Check subscription type
      const subscriptionType = req.user['subscriptionType'];

      if (subscriptionType === SubscriptionType.PREMIUM) {
        return RateLimitTier.PREMIUM;
      } else if (subscriptionType === SubscriptionType.PRO) {
        return RateLimitTier.BASIC;
      } else {
        return RateLimitTier.FREE;
      }
    }

    // Default to anonymous
    return RateLimitTier.ANONYMOUS;
  }

  /**
   * Get endpoint path for sensitivity calculation
   */
  private getEndpointPath(req: RequestWithUser): string {
    const path = req.path;

    // Find the most specific matching endpoint
    const matchingEndpoints = Object.keys(this.endpointSensitivity)
      .filter(endpoint => path.startsWith(endpoint))
      .sort((a, b) => b.length - a.length); // Sort by length descending

    return matchingEndpoints.length > 0 ? matchingEndpoints[0] : '/api';
  }

  /**
   * Get endpoint sensitivity multiplier
   */
  private getEndpointSensitivity(endpoint: string): number {
    return this.endpointSensitivity[endpoint] || 1;
  }
}
