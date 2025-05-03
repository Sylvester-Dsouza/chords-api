import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SystemMonitoringService } from '../services/system-monitoring.service';

@Injectable()
export class RequestTrackingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestTrackingMiddleware.name);

  constructor(private readonly systemMonitoringService: SystemMonitoringService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Record start time
    const startTime = Date.now();
    
    // Add response listener to track when the request completes
    res.on('finish', () => {
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Track the request
      this.systemMonitoringService.trackRequest(
        req.path,
        res.statusCode,
        responseTime,
      );
      
      // Log request details for debugging
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`,
        );
      }
    });
    
    next();
  }
}
