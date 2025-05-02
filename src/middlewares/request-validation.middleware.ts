import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { AuditLogService, AuditLogSeverity } from '../services/audit-log.service';
import sanitizeHtml from 'sanitize-html';
import * as validator from 'validator';

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestValidationMiddleware.name);

  // List of sensitive routes that require extra validation
  private readonly sensitiveRoutes = [
    '/api/auth',
    '/api/admin',
    '/api/users',
    '/api/customers',
    '/api/subscriptions',
    '/api/transactions',
  ];

  // List of allowed HTML tags for content that allows HTML
  private readonly allowedHtmlTags = [
    'b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
  ];

  constructor(private readonly auditLogService: AuditLogService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      // Skip validation for GET requests (they don't have a body)
      if (req.method === 'GET') {
        return next();
      }

      // Validate and sanitize request body
      if (req.body) {
        this.validateAndSanitizeBody(req);
      }

      // Check for suspicious patterns in sensitive routes
      if (this.isSensitiveRoute(req.path)) {
        const suspiciousPatterns = this.checkForSuspiciousPatterns(req);

        if (suspiciousPatterns.length > 0) {
          // Log suspicious activity
          await this.auditLogService.logSecurity(
            'Suspicious request patterns detected',
            AuditLogSeverity.WARNING,
            req.user?.['id'],
            req.ip,
            req.headers['user-agent'],
            {
              path: req.path,
              method: req.method,
              patterns: suspiciousPatterns,
            }
          );

          this.logger.warn(`Suspicious request detected: ${req.method} ${req.path}`);
          this.logger.warn(`Patterns: ${suspiciousPatterns.join(', ')}`);
        }
      }

      next();
    } catch (error: any) {
      // Log validation error
      await this.auditLogService.logSecurity(
        'Request validation error',
        AuditLogSeverity.WARNING,
        req.user?.['id'],
        req.ip,
        req.headers['user-agent'],
        {
          path: req.path,
          method: req.method,
          error: error.message,
        }
      );

      this.logger.error(`Request validation error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Check if the route is sensitive
   */
  private isSensitiveRoute(path: string): boolean {
    return this.sensitiveRoutes.some(route => path.startsWith(route));
  }

  /**
   * Validate and sanitize request body
   */
  private validateAndSanitizeBody(req: RequestWithUser): void {
    // Deep clone the body to avoid modifying the original during validation
    const body = JSON.parse(JSON.stringify(req.body));

    // Recursively sanitize the body
    req.body = this.sanitizeObject(body);
  }

  /**
   * Recursively sanitize an object
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Sanitize string values
        sanitized[key] = this.sanitizeString(key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeObject(value);
      } else {
        // Keep other values as is
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(key: string, value: string): string {
    // Check if this field might contain HTML
    const mightContainHtml = ['description', 'content', 'text', 'notes', 'bio', 'lyrics', 'chordSheet'].some(
      field => key.toLowerCase().includes(field)
    );

    if (mightContainHtml) {
      // Sanitize HTML content
      return sanitizeHtml(value, {
        allowedTags: this.allowedHtmlTags,
        allowedAttributes: {
          'a': ['href', 'target', 'rel'],
        },
      });
    } else {
      // For non-HTML fields, escape HTML entities
      return validator.escape(value);
    }
  }

  /**
   * Check for suspicious patterns in the request
   */
  private checkForSuspiciousPatterns(req: RequestWithUser): string[] {
    const suspiciousPatterns: string[] = [];

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
    ];

    // Check for XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /javascript:[^>]*/i,
      /onerror\s*=\s*/i,
      /onclick\s*=\s*/i,
      /onload\s*=\s*/i,
    ];

    // Check for path traversal
    const pathTraversalPatterns = [
      /\.\.\//i,
      /\.\.\\\\i/,
    ];

    // Function to check a value against patterns
    const checkValue = (value: any, patterns: RegExp[], patternType: string) => {
      if (typeof value === 'string') {
        for (const pattern of patterns) {
          if (pattern.test(value)) {
            suspiciousPatterns.push(`${patternType} in value`);
            break;
          }
        }
      }
    };

    // Function to recursively check an object
    const checkObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') {
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach(item => checkObject(item));
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        // Check keys
        checkValue(key, sqlInjectionPatterns, 'SQL injection pattern');
        checkValue(key, xssPatterns, 'XSS pattern');
        checkValue(key, pathTraversalPatterns, 'Path traversal pattern');

        // Check values
        if (typeof value === 'string') {
          checkValue(value, sqlInjectionPatterns, 'SQL injection pattern');
          checkValue(value, xssPatterns, 'XSS pattern');
          checkValue(value, pathTraversalPatterns, 'Path traversal pattern');
        } else if (typeof value === 'object' && value !== null) {
          checkObject(value);
        }
      }
    };

    // Check query parameters
    checkObject(req.query);

    // Check body
    checkObject(req.body);

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'x-client-ip',
      'x-real-ip',
    ];

    for (const header of suspiciousHeaders) {
      if (req.headers[header] && Array.isArray(req.headers[header])) {
        suspiciousPatterns.push(`Multiple values for header ${header}`);
      }
    }

    return suspiciousPatterns;
  }
}
