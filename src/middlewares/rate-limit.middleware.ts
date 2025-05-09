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
    [RateLimitTier.ANONYMOUS]: { points: 100, duration: 60, blockDuration: 30 }, // Increased for development
    [RateLimitTier.FREE]: { points: 200, duration: 60, blockDuration: 15 },     // Increased for real users
    [RateLimitTier.BASIC]: { points: 300, duration: 60, blockDuration: 0 },     // Increased for paid users
    [RateLimitTier.PREMIUM]: { points: 500, duration: 60, blockDuration: 0 },   // Increased for premium users
    [RateLimitTier.ADMIN]: { points: 3000, duration: 60, blockDuration: 0 },    // Increased for admin users
  };

  // Endpoint sensitivity multipliers (higher = stricter limits)
  private readonly endpointSensitivity: Record<string, number> = {
    '/api/auth': 0.3,        // Auth endpoints get more lenient limits
    '/api/songs': 0.7,       // More lenient for songs
    '/api/artists': 0.7,     // More lenient for artists
    '/api/collections': 0.7, // More lenient for collections
    '/api/comments': 0.5,    // Comments get more lenient limits
    '/api/admin': 0.2,       // Admin endpoints get more lenient limits
    '/api/admin/analytics': 0.1, // Analytics endpoints get very lenient limits
    '/api/chord-diagrams': 1.5, // Chord diagrams get stricter limits but less than before
  };

  // Whitelist of IPs that should bypass rate limiting (development IPs)
  private readonly whitelistedIps: string[] = [
    '127.0.0.1',       // Localhost
    '::1',             // Localhost IPv6
    '192.168.1.2',     // Your development machine
    '192.168.1.5',     // Another development machine
    '10.0.2.2',        // Android emulator
  ];

  // User agents that are likely bots
  private readonly botUserAgents: string[] = [
    'bot',
    'crawl',
    'spider',
    'scrape',
    'headless',
    'python-requests',
    'go-http-client',
    'wget',
    'curl',
  ];

  constructor(private readonly redisService: RedisService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    if (!this.redisService.isReady()) {
      // If Redis is not available, skip rate limiting
      return next();
    }

    try {
      // Skip rate limiting for development environments
      if (process.env.NODE_ENV === 'development') {
        return next();
      }

      // Skip rate limiting for whitelisted IPs (development)
      const ip = req.ip ||
                 req.socket.remoteAddress ||
                 (req.headers['x-forwarded-for'] as string) ||
                 'unknown';

      const whitelistedIps = [
        '127.0.0.1',       // Localhost
        '::1',             // Localhost IPv6
        '192.168.1.2',     // Your development machine
        '192.168.1.5',     // Another development machine
        '10.0.2.2',        // Android emulator
      ];

      if (whitelistedIps.includes(ip)) {
        return next();
      }

      // Skip rate limiting for authenticated users (customers and admin users)
      if (req.user) {
        return next();
      }

      // Skip rate limiting for non-sensitive endpoints
      const nonSensitiveEndpoints = [
        '/api/health',
        '/health',
        '/api/songs',
        '/songs',
        '/api/artists',
        '/artists',
        '/api/collections',
        '/collections',
      ];

      if (nonSensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
        return next();
      }

      // Check for bot-like behavior
      const userAgent = req.headers['user-agent'] || '';
      const botPatterns = [
        'bot',
        'crawl',
        'spider',
        'scrape',
        'headless',
        'python-requests',
        'go-http-client',
        'wget',
        'curl',
      ];

      const isLikelyBot = botPatterns.some(pattern =>
        userAgent.toLowerCase().includes(pattern)
      );

      // Apply stricter rate limits for suspected bots
      if (isLikelyBot) {
        // Determine endpoint path for sensitivity
        const endpoint = this.getEndpointPath(req);

        // Create Redis key for this client and endpoint
        const key = `ratelimit:bot:${ip}:${endpoint}`;

        // Very strict limits for bots: 10 requests per minute
        const botLimit = 10;
        const duration = 60;

        // Increment request count
        const count = await this.redisService.increment(key, duration);

        // Set rate limit headers
        res.header('X-RateLimit-Limit', botLimit.toString());
        res.header('X-RateLimit-Remaining', Math.max(0, botLimit - count).toString());

        const ttl = await this.redisService.ttl(key);
        res.header('X-RateLimit-Reset', ttl.toString());

        // Check if rate limit is exceeded
        if (count > botLimit) {
          // Block bots for 5 minutes if they exceed the limit
          const blockKey = `ratelimit:blocked:bot:${ip}:${endpoint}`;
          await this.redisService.set(blockKey, 'blocked', 300);

          this.logger.warn(`Bot rate limit exceeded for ${ip} on ${endpoint} (${count}/${botLimit})`);

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many requests, please try again later.',
              retryAfter: ttl,
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
      }

      // For all other requests (anonymous, non-bot), apply very lenient limits
      // This is just a safety measure to prevent abuse
      const anonymousLimit = 300; // 300 requests per minute
      const duration = 60;

      // Determine endpoint path for sensitivity
      const endpoint = this.getEndpointPath(req);

      // Create Redis key for this client and endpoint
      const key = `ratelimit:anonymous:${ip}:${endpoint}`;

      // Increment request count
      const count = await this.redisService.increment(key, duration);

      // Set rate limit headers
      res.header('X-RateLimit-Limit', anonymousLimit.toString());
      res.header('X-RateLimit-Remaining', Math.max(0, anonymousLimit - count).toString());

      const ttl = await this.redisService.ttl(key);
      res.header('X-RateLimit-Reset', ttl.toString());

      // Check if rate limit is exceeded
      if (count > anonymousLimit) {
        // Block for 1 minute if they exceed the limit
        const blockKey = `ratelimit:blocked:anonymous:${ip}:${endpoint}`;
        await this.redisService.set(blockKey, 'blocked', 60);

        this.logger.warn(`Anonymous rate limit exceeded for ${ip} on ${endpoint} (${count}/${anonymousLimit})`);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
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
