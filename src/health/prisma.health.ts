import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async pingCheck(key: string, options: { timeout?: number } = {}): Promise<HealthIndicatorResult> {
    const timeout = options.timeout || 1000;
    
    try {
      // Use a simple query with timeout to check if Prisma is connected
      const result = await Promise.race([
        this.prismaService.$queryRaw`SELECT 1`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), timeout)
        ),
      ]);
      
      return this.getStatus(key, true, { responseTime: `${timeout}ms` });
    } catch (error: any) {
      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false, { message: error.message || 'Unknown database error' })
      );
    }
  }
}
