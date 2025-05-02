import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

// Define interface for AuditLog model since it's not in the Prisma client yet
interface AuditLog {
  id: string;
  type: string;
  severity: string;
  action: string;
  userId?: string;
  targetId?: string;
  targetType?: string;
  ip?: string;
  userAgent?: string;
  details?: string;
  createdAt: Date;
}

export enum AuditLogType {
  AUTH = 'AUTH',
  USER = 'USER',
  CONTENT = 'CONTENT',
  ADMIN = 'ADMIN',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

export enum AuditLogSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogData {
  type: AuditLogType;
  severity: AuditLogSeverity;
  action: string;
  userId?: string;
  targetId?: string;
  targetType?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   * @param data Audit log data
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // Create the audit log entry using raw SQL
      const details = data.details ? JSON.stringify(data.details) : null;
      const now = new Date();

      await this.prisma.$executeRaw`
        INSERT INTO "AuditLog" (
          "id", "type", "severity", "action", "userId", "targetId",
          "targetType", "ip", "userAgent", "details", "createdAt"
        ) VALUES (
          gen_random_uuid(), ${data.type}, ${data.severity}, ${data.action},
          ${data.userId}, ${data.targetId}, ${data.targetType},
          ${data.ip}, ${data.userAgent}, ${details}, ${now}
        )
      `;

      // Log to console for critical events
      if (data.severity === AuditLogSeverity.CRITICAL) {
        this.logger.warn(`CRITICAL AUDIT: ${data.action} - ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      this.logger.error(`Error creating audit log: ${error.message}`);
      // Don't throw the error - audit logging should not break the application
    }
  }

  /**
   * Log an authentication event
   * @param action Action description
   * @param userId User ID
   * @param success Whether the authentication was successful
   * @param ip IP address
   * @param userAgent User agent
   * @param details Additional details
   */
  async logAuth(
    action: string,
    userId: string,
    success: boolean,
    ip?: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    const severity = success ? AuditLogSeverity.INFO : AuditLogSeverity.WARNING;

    await this.log({
      type: AuditLogType.AUTH,
      severity,
      action,
      userId,
      ip,
      userAgent,
      details: {
        ...details,
        success,
      },
    });
  }

  /**
   * Log a security event
   * @param action Action description
   * @param severity Event severity
   * @param userId User ID (if applicable)
   * @param ip IP address
   * @param userAgent User agent
   * @param details Additional details
   */
  async logSecurity(
    action: string,
    severity: AuditLogSeverity,
    userId?: string,
    ip?: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      type: AuditLogType.SECURITY,
      severity,
      action,
      userId,
      ip,
      userAgent,
      details,
    });
  }

  /**
   * Log a content modification event
   * @param action Action description
   * @param userId User ID
   * @param targetId Target ID (e.g., song ID)
   * @param targetType Target type (e.g., 'song')
   * @param details Additional details
   */
  async logContentChange(
    action: string,
    userId: string,
    targetId: string,
    targetType: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      type: AuditLogType.CONTENT,
      severity: AuditLogSeverity.INFO,
      action,
      userId,
      targetId,
      targetType,
      details,
    });
  }

  /**
   * Log an admin action
   * @param action Action description
   * @param userId Admin user ID
   * @param targetId Target ID (if applicable)
   * @param targetType Target type (if applicable)
   * @param details Additional details
   */
  async logAdminAction(
    action: string,
    userId: string,
    targetId?: string,
    targetType?: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      type: AuditLogType.ADMIN,
      severity: AuditLogSeverity.INFO,
      action,
      userId,
      targetId,
      targetType,
      details,
    });
  }

  /**
   * Get audit logs with filtering
   * @param type Log type filter
   * @param severity Log severity filter
   * @param userId User ID filter
   * @param startDate Start date filter
   * @param endDate End date filter
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated audit logs
   */
  async getAuditLogs(
    type?: AuditLogType,
    severity?: AuditLogSeverity,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    page = 1,
    limit = 50,
  ): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Build the WHERE clause for the SQL query
    let whereClause = '';
    const conditions: string[] = [];

    if (type) {
      conditions.push(`"type" = '${type}'`);
    }

    if (severity) {
      conditions.push(`"severity" = '${severity}'`);
    }

    if (userId) {
      conditions.push(`"userId" = '${userId}'`);
    }

    if (startDate) {
      conditions.push(`"createdAt" >= '${startDate.toISOString()}'`);
    }

    if (endDate) {
      conditions.push(`"createdAt" <= '${endDate.toISOString()}'`);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Execute queries in parallel
    const [logsResult, totalResult] = await Promise.all([
      // For the logs query
      whereClause
        ? this.prisma.$queryRaw<AuditLog[]>`
            SELECT *
            FROM "AuditLog"
            ${Prisma.raw(whereClause)}
            ORDER BY "createdAt" DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : this.prisma.$queryRaw<AuditLog[]>`
            SELECT *
            FROM "AuditLog"
            ORDER BY "createdAt" DESC
            LIMIT ${limit} OFFSET ${offset}
          `,

      // For the count query
      whereClause
        ? this.prisma.$queryRaw<{count: string}[]>`
            SELECT COUNT(*) as count
            FROM "AuditLog"
            ${Prisma.raw(whereClause)}
          `
        : this.prisma.$queryRaw<{count: string}[]>`
            SELECT COUNT(*) as count
            FROM "AuditLog"
          `,
    ]);

    const logs = logsResult || [];
    const total = parseInt(totalResult[0]?.count || '0', 10);

    // Parse JSON details
    const parsedLogs = logs.map((log: AuditLog) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return {
      data: parsedLogs,
      total,
      page,
      limit,
    };
  }
}
