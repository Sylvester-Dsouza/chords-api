import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Production Safety Guard
 * 
 * This guard prevents any dangerous database operations in production environment.
 * It blocks any endpoints that could potentially reset, drop, or wipe database data.
 */
@Injectable()
export class ProductionSafetyGuard implements CanActivate {
  private readonly logger = new Logger(ProductionSafetyGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    if (!isProduction) {
      // Allow all operations in non-production environments
      return true;
    }

    // List of dangerous operations that are NEVER allowed in production
    const dangerousOperations = [
      // Database reset operations
      '/reset',
      '/drop',
      '/truncate',
      '/wipe',
      '/clear-all',
      '/delete-all',
      
      // Migration reset operations
      '/migrate/reset',
      '/migration/reset',
      '/prisma/reset',
      '/db/reset',
      '/database/reset',
      
      // Bulk delete operations
      '/bulk-delete',
      '/mass-delete',
      '/purge',
      
      // Schema operations
      '/schema/drop',
      '/schema/reset',
      '/schema/wipe',
      
      // Admin dangerous operations
      '/admin/reset',
      '/admin/wipe',
      '/admin/purge',
      '/admin/delete-all',
      
      // System dangerous operations
      '/system/reset',
      '/system/wipe',
      '/system/factory-reset',
    ];

    const requestPath = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    // Check if the request path contains any dangerous operations
    for (const dangerousOp of dangerousOperations) {
      if (requestPath.includes(dangerousOp.toLowerCase())) {
        this.logger.error(
          `🚨 PRODUCTION SAFETY VIOLATION: Blocked dangerous operation "${dangerousOp}" in production environment`,
          {
            path: requestPath,
            method: method,
            ip: request.ip,
            userAgent: request.get('User-Agent'),
            timestamp: new Date().toISOString(),
          }
        );
        
        throw new ForbiddenException(
          `PRODUCTION SAFETY: Operation "${dangerousOp}" is not allowed in production environment. ` +
          `This is a safety measure to protect the production database.`
        );
      }
    }

    // Additional checks for DELETE methods on sensitive endpoints
    if (method === 'DELETE') {
      const sensitiveDeleteEndpoints = [
        '/songs',
        '/artists', 
        '/collections',
        '/users',
        '/customers',
        '/setlists',
        '/admin',
        '/system',
      ];

      // Check if it's a bulk delete operation (no specific ID)
      for (const endpoint of sensitiveDeleteEndpoints) {
        if (requestPath === endpoint || requestPath === endpoint + '/') {
          this.logger.error(
            `🚨 PRODUCTION SAFETY VIOLATION: Blocked bulk DELETE operation on "${endpoint}" in production`,
            {
              path: requestPath,
              method: method,
              ip: request.ip,
              userAgent: request.get('User-Agent'),
              timestamp: new Date().toISOString(),
            }
          );
          
          throw new ForbiddenException(
            `PRODUCTION SAFETY: Bulk DELETE operations on "${endpoint}" are not allowed in production. ` +
            `Only individual record deletions with specific IDs are permitted.`
          );
        }
      }
    }

    // Log successful safety check for monitoring
    this.logger.debug(`Production safety check passed for ${method} ${requestPath}`);
    
    return true;
  }
}
