import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

/**
 * Database Protection Service
 * 
 * This service provides additional protection against dangerous database operations
 * in production environment. It acts as a safety layer to prevent accidental
 * data loss or database corruption.
 */
@Injectable()
export class DatabaseProtectionService {
  private readonly logger = new Logger(DatabaseProtectionService.name);
  private readonly isProduction: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    
    if (this.isProduction) {
      this.logger.warn('🛡️ Database Protection Service activated for PRODUCTION environment');
    }
  }

  /**
   * Check if a database operation is safe to execute in production
   */
  private checkProductionSafety(operation: string, details?: any): void {
    if (!this.isProduction) {
      return; // Allow all operations in non-production
    }

    // List of operations that are NEVER allowed in production
    const forbiddenOperations = [
      'DROP_DATABASE',
      'DROP_SCHEMA', 
      'TRUNCATE_ALL',
      'DELETE_ALL',
      'RESET_DATABASE',
      'WIPE_DATABASE',
      'FACTORY_RESET',
      'BULK_DELETE_USERS',
      'BULK_DELETE_CUSTOMERS',
      'BULK_DELETE_SONGS',
      'BULK_DELETE_ARTISTS',
      'BULK_DELETE_COLLECTIONS',
      'BULK_DELETE_SETLISTS',
    ];

    if (forbiddenOperations.includes(operation)) {
      this.logger.error(
        `🚨 CRITICAL: Attempted forbidden database operation "${operation}" in production`,
        { operation, details, timestamp: new Date().toISOString() }
      );
      
      throw new ForbiddenException(
        `PRODUCTION DATABASE PROTECTION: Operation "${operation}" is strictly forbidden in production environment. ` +
        `This is a critical safety measure to protect production data.`
      );
    }
  }

  /**
   * Prevent database reset operations
   */
  async preventDatabaseReset(): Promise<never> {
    this.checkProductionSafety('RESET_DATABASE');
    
    this.logger.error('🚨 CRITICAL: Database reset attempted in production environment');
    throw new ForbiddenException(
      'DATABASE RESET IS PERMANENTLY DISABLED IN PRODUCTION. ' +
      'This operation cannot be performed under any circumstances to protect production data.'
    );
  }

  /**
   * Prevent database drop operations
   */
  async preventDatabaseDrop(): Promise<never> {
    this.checkProductionSafety('DROP_DATABASE');
    
    this.logger.error('🚨 CRITICAL: Database drop attempted in production environment');
    throw new ForbiddenException(
      'DATABASE DROP IS PERMANENTLY DISABLED IN PRODUCTION. ' +
      'This operation cannot be performed under any circumstances to protect production data.'
    );
  }

  /**
   * Prevent truncate all operations
   */
  async preventTruncateAll(): Promise<never> {
    this.checkProductionSafety('TRUNCATE_ALL');
    
    this.logger.error('🚨 CRITICAL: Truncate all attempted in production environment');
    throw new ForbiddenException(
      'TRUNCATE ALL IS PERMANENTLY DISABLED IN PRODUCTION. ' +
      'This operation cannot be performed under any circumstances to protect production data.'
    );
  }

  /**
   * Prevent bulk delete operations on critical tables
   */
  async preventBulkDelete(tableName: string): Promise<never> {
    const operation = `BULK_DELETE_${tableName.toUpperCase()}`;
    this.checkProductionSafety(operation);
    
    this.logger.error(`🚨 CRITICAL: Bulk delete on ${tableName} attempted in production environment`);
    throw new ForbiddenException(
      `BULK DELETE ON ${tableName.toUpperCase()} IS PERMANENTLY DISABLED IN PRODUCTION. ` +
      'Only individual record deletions with specific IDs are allowed to protect production data.'
    );
  }

  /**
   * Validate that a delete operation is safe (has specific ID)
   */
  validateSafeDelete(tableName: string, id?: string): void {
    if (!this.isProduction) {
      return; // Allow all operations in non-production
    }

    if (!id || id.trim() === '') {
      this.logger.error(`🚨 CRITICAL: Attempted unsafe delete on ${tableName} without specific ID in production`);
      throw new ForbiddenException(
        `PRODUCTION SAFETY: Delete operations on ${tableName} must specify a valid ID. ` +
        'Bulk deletions are not allowed in production environment.'
      );
    }

    this.logger.debug(`✅ Safe delete validated for ${tableName} with ID: ${id}`);
  }

  /**
   * Log database operation for audit trail
   */
  logDatabaseOperation(operation: string, tableName: string, details?: any): void {
    if (this.isProduction) {
      this.logger.log(
        `📊 Database operation: ${operation} on ${tableName}`,
        { operation, tableName, details, timestamp: new Date().toISOString() }
      );
    }
  }

  /**
   * Check if current environment is production
   */
  isProductionEnvironment(): boolean {
    return this.isProduction;
  }

  /**
   * Get database protection status
   */
  getProtectionStatus(): {
    isProduction: boolean;
    protectionActive: boolean;
    message: string;
  } {
    return {
      isProduction: this.isProduction,
      protectionActive: this.isProduction,
      message: this.isProduction 
        ? 'Database protection is ACTIVE. Dangerous operations are blocked.'
        : 'Database protection is INACTIVE. All operations are allowed in development.',
    };
  }
}
