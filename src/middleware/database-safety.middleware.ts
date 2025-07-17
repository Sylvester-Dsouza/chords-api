import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Database Safety Middleware
 * 
 * This middleware intercepts all requests and blocks any that could
 * potentially harm the production database. It acts as the first line
 * of defense against dangerous operations.
 */
@Injectable()
export class DatabaseSafetyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DatabaseSafetyMiddleware.name);
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    
    if (this.isProduction) {
      this.logger.warn('🛡️ Database Safety Middleware activated for PRODUCTION environment');
    }
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.isProduction) {
      // Allow all operations in non-production environments
      return next();
    }

    const method = req.method.toUpperCase();
    const path = req.path.toLowerCase();
    const fullUrl = req.originalUrl.toLowerCase();

    // Block any URLs containing dangerous keywords
    const dangerousKeywords = [
      'reset',
      'drop',
      'truncate', 
      'wipe',
      'purge',
      'clear-all',
      'delete-all',
      'factory-reset',
      'nuke',
      'destroy',
      'obliterate',
    ];

    // Check for dangerous keywords in the URL
    for (const keyword of dangerousKeywords) {
      if (fullUrl.includes(keyword)) {
        this.logger.error(
          `🚨 BLOCKED: Dangerous keyword "${keyword}" detected in production request`,
          {
            method,
            path: req.path,
            fullUrl: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
          }
        );

        throw new ForbiddenException(
          `PRODUCTION SAFETY: Requests containing "${keyword}" are blocked in production environment. ` +
          'This is a safety measure to protect the production database.'
        );
      }
    }

    // Block dangerous SQL operations in request body
    if (req.body && typeof req.body === 'object') {
      const bodyString = JSON.stringify(req.body).toLowerCase();
      
      const dangerousSqlKeywords = [
        'drop table',
        'drop database',
        'truncate table',
        'delete from',
        'drop schema',
        'alter table drop',
        'drop index',
        'drop view',
        'drop function',
        'drop procedure',
      ];

      for (const sqlKeyword of dangerousSqlKeywords) {
        if (bodyString.includes(sqlKeyword)) {
          this.logger.error(
            `🚨 BLOCKED: Dangerous SQL keyword "${sqlKeyword}" detected in production request body`,
            {
              method,
              path: req.path,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date().toISOString(),
            }
          );

          throw new ForbiddenException(
            `PRODUCTION SAFETY: SQL operations containing "${sqlKeyword}" are blocked in production. ` +
            'This is a safety measure to protect the production database.'
          );
        }
      }
    }

    // Block dangerous query parameters
    const queryString = req.url.toLowerCase();
    const dangerousQueryParams = [
      'reset=true',
      'drop=true', 
      'truncate=true',
      'wipe=true',
      'delete_all=true',
      'force_reset=true',
    ];

    for (const queryParam of dangerousQueryParams) {
      if (queryString.includes(queryParam)) {
        this.logger.error(
          `🚨 BLOCKED: Dangerous query parameter "${queryParam}" detected in production request`,
          {
            method,
            path: req.path,
            query: req.query,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
          }
        );

        throw new ForbiddenException(
          `PRODUCTION SAFETY: Query parameter "${queryParam}" is blocked in production environment. ` +
          'This is a safety measure to protect the production database.'
        );
      }
    }

    // Log successful safety check for monitoring
    this.logger.debug(`Database safety check passed for ${method} ${req.path}`);
    
    next();
  }
}
