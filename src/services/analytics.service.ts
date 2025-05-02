import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';

// Define interfaces for our analytics models since they're not in the Prisma client yet
interface ContentView {
  id: string;
  contentType: string;
  contentId: string;
  customerId?: string;
  sessionId?: string;
  timestamp: Date;
  duration?: number;
  source?: string;
}

interface PageView {
  id: string;
  sessionId: string;
  customerId?: string;
  page: string;
  referrer?: string;
  parameters?: any;
  timestamp: Date;
  duration?: number;
}

interface UserSession {
  id: string;
  customerId: string;
  startTime: Date;
  endTime?: Date;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  appVersion?: string;
  platform?: string;
  isActive: boolean;
}

interface DailyMetrics {
  id: string;
  date: Date;
  activeUsers: number;
  newUsers: number;
  totalPageViews: number;
  totalSongViews: number;
  totalArtistViews: number;
  totalCollectionViews: number;
  totalLikes: number;
  totalComments: number;
}

// Type for content view count result
interface ContentViewCount {
  contentId: string;
  _count: {
    contentId: number;
  };
}

// Type for platform distribution
interface PlatformDistribution {
  [key: string]: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Track a content view (song, artist, collection)
   * @param contentType The type of content ('song', 'artist', 'collection')
   * @param contentId The ID of the content
   * @param customerId The ID of the customer (optional)
   * @param sessionId The ID of the session (optional)
   * @param source How the content was found (optional)
   */
  async trackContentView(
    contentType: string,
    contentId: string,
    customerId?: string,
    sessionId?: string,
    source?: string,
  ): Promise<void> {
    try {
      // Create content view record using raw SQL
      await this.prisma.$executeRaw`
        INSERT INTO "ContentView" (
          "id", "contentType", "contentId", "customerId", "sessionId", "source", "timestamp"
        ) VALUES (
          gen_random_uuid(), ${contentType}, ${contentId}, ${customerId}, ${sessionId}, ${source}, NOW()
        )
      `;

      // The database trigger will handle incrementing the view count
      this.logger.debug(
        `Tracked ${contentType} view: ${contentId} by ${customerId || 'anonymous'}`,
      );
    } catch (error: any) {
      // Don't let analytics errors affect the user experience
      this.logger.error(
        `Error tracking ${contentType} view: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Track a page view
   * @param page The page name
   * @param sessionId The session ID
   * @param customerId The customer ID (optional)
   * @param referrer The referrer (optional)
   * @param parameters Additional parameters (optional)
   */
  async trackPageView(
    page: string,
    sessionId: string,
    customerId?: string,
    referrer?: string,
    parameters?: any,
  ): Promise<void> {
    try {
      // Using raw SQL until Prisma client is updated
      await this.prisma.$executeRaw`
        INSERT INTO "PageView" (
          "id", "page", "sessionId", "customerId", "referrer", "parameters", "timestamp"
        ) VALUES (
          gen_random_uuid(), ${page}, ${sessionId}, ${customerId}, ${referrer}, ${parameters ? JSON.stringify(parameters) : null}, NOW()
        )
      `;

      this.logger.debug(
        `Tracked page view: ${page} by ${customerId || 'anonymous'}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error tracking page view: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Create or update a user session
   * @param customerId The customer ID
   * @param deviceInfo Device information (optional)
   * @param ipAddress IP address (optional)
   * @param userAgent User agent (optional)
   * @param appVersion App version (optional)
   * @param platform Platform (optional)
   * @returns The session ID
   */
  async createOrUpdateSession(
    customerId: string,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string,
    appVersion?: string,
    platform?: string,
  ): Promise<string> {
    try {
      // Check for an existing active session for this customer using raw SQL
      const existingSessions = await this.prisma.$queryRaw<UserSession[]>`
        SELECT * FROM "UserSession"
        WHERE "customerId" = ${customerId}
          AND "isActive" = true
          AND "startTime" >= NOW() - INTERVAL '30 minutes'
        ORDER BY "startTime" DESC
        LIMIT 1
      `;

      const existingSession = existingSessions.length > 0 ? existingSessions[0] : null;

      if (existingSession) {
        // Update the existing session
        await this.prisma.$executeRaw`
          UPDATE "UserSession"
          SET
            "deviceInfo" = COALESCE(${deviceInfo}, "deviceInfo"),
            "ipAddress" = COALESCE(${ipAddress}, "ipAddress"),
            "userAgent" = COALESCE(${userAgent}, "userAgent"),
            "appVersion" = COALESCE(${appVersion}, "appVersion"),
            "platform" = COALESCE(${platform}, "platform")
          WHERE "id" = ${existingSession.id}
        `;

        return existingSession.id;
      }

      // Create a new session
      const newSessions = await this.prisma.$queryRaw<{id: string}[]>`
        INSERT INTO "UserSession" (
          "id", "customerId", "deviceInfo", "ipAddress", "userAgent", "appVersion", "platform", "startTime", "isActive"
        ) VALUES (
          gen_random_uuid(), ${customerId}, ${deviceInfo}, ${ipAddress}, ${userAgent}, ${appVersion}, ${platform}, NOW(), true
        )
        RETURNING "id"
      `;

      return newSessions[0]?.id || 'error-creating-session';
    } catch (error: any) {
      this.logger.error(
        `Error creating/updating session: ${error.message}`,
        error.stack,
      );
      // Return a placeholder ID in case of error
      return 'error-creating-session';
    }
  }

  /**
   * End a user session
   * @param sessionId The session ID
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE "UserSession"
        SET "endTime" = NOW(), "isActive" = false
        WHERE "id" = ${sessionId}
      `;

      this.logger.debug(`Ended session: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(
        `Error ending session: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get analytics for songs
   * @param limit The number of songs to return
   * @param period The time period ('day', 'week', 'month', 'year', 'all')
   * @returns The most viewed songs
   */
  async getMostViewedSongs(
    limit: number = 10,
    period: string = 'all',
  ): Promise<any[]> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.STATS,
      `most-viewed-songs-${limit}-${period}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = this.getStartDateForPeriod(period);

        if (period === 'all') {
          // Get songs ordered by total view count using raw SQL
          return this.prisma.$queryRaw`
            SELECT s.*, a.name as "artistName"
            FROM "Song" s
            JOIN "Artist" a ON s."artistId" = a.id
            ORDER BY s."viewCount" DESC
            LIMIT ${limit}
          `;
        } else {
          // Get songs based on content views in the specified period
          const songViews = await this.prisma.$queryRaw<{contentId: string, count: string}[]>`
            SELECT "contentId", COUNT("contentId") as count
            FROM "ContentView"
            WHERE "contentType" = 'song'
              AND "timestamp" >= ${startDate}
            GROUP BY "contentId"
            ORDER BY count DESC
            LIMIT ${limit}
          `;

          // Get the actual song data
          const songIds = songViews.map((view) => view.contentId);

          if (songIds.length === 0) {
            return [];
          }

          // Using IN with raw SQL is tricky, so we'll do a simpler query
          return this.prisma.$queryRaw`
            SELECT s.*, a.name as "artistName"
            FROM "Song" s
            JOIN "Artist" a ON s."artistId" = a.id
            WHERE s.id IN (${songIds.join(',')})
          `;
        }
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get analytics for artists
   * @param limit The number of artists to return
   * @param period The time period ('day', 'week', 'month', 'year', 'all')
   * @returns The most viewed artists
   */
  async getMostViewedArtists(
    limit: number = 10,
    period: string = 'all',
  ): Promise<any[]> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.STATS,
      `most-viewed-artists-${limit}-${period}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = this.getStartDateForPeriod(period);

        if (period === 'all') {
          // Get artists ordered by total view count
          return this.prisma.$queryRaw`
            SELECT *
            FROM "Artist"
            ORDER BY "viewCount" DESC
            LIMIT ${limit}
          `;
        } else {
          // Get artists based on content views in the specified period
          const artistViews = await this.prisma.$queryRaw<{contentId: string, count: string}[]>`
            SELECT "contentId", COUNT("contentId") as count
            FROM "ContentView"
            WHERE "contentType" = 'artist'
              AND "timestamp" >= ${startDate}
            GROUP BY "contentId"
            ORDER BY count DESC
            LIMIT ${limit}
          `;

          // Get the actual artist data
          const artistIds = artistViews.map((view) => view.contentId);

          if (artistIds.length === 0) {
            return [];
          }

          return this.prisma.$queryRaw`
            SELECT *
            FROM "Artist"
            WHERE id IN (${artistIds.join(',')})
          `;
        }
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get analytics for collections
   * @param limit The number of collections to return
   * @param period The time period ('day', 'week', 'month', 'year', 'all')
   * @returns The most viewed collections
   */
  async getMostViewedCollections(
    limit: number = 10,
    period: string = 'all',
  ): Promise<any[]> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.STATS,
      `most-viewed-collections-${limit}-${period}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = this.getStartDateForPeriod(period);

        if (period === 'all') {
          // Get collections ordered by total view count
          return this.prisma.$queryRaw`
            SELECT *
            FROM "Collection"
            ORDER BY "viewCount" DESC
            LIMIT ${limit}
          `;
        } else {
          // Get collections based on content views in the specified period
          const collectionViews = await this.prisma.$queryRaw<{contentId: string, count: string}[]>`
            SELECT "contentId", COUNT("contentId") as count
            FROM "ContentView"
            WHERE "contentType" = 'collection'
              AND "timestamp" >= ${startDate}
            GROUP BY "contentId"
            ORDER BY count DESC
            LIMIT ${limit}
          `;

          // Get the actual collection data
          const collectionIds = collectionViews.map((view) => view.contentId);

          if (collectionIds.length === 0) {
            return [];
          }

          return this.prisma.$queryRaw`
            SELECT *
            FROM "Collection"
            WHERE id IN (${collectionIds.join(',')})
          `;
        }
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get daily metrics for a date range
   * @param startDate The start date
   * @param endDate The end date
   * @returns Daily metrics for the date range
   */
  async getDailyMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<DailyMetrics[]> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.STATS,
      `daily-metrics-${startDate.toISOString()}-${endDate.toISOString()}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.$queryRaw<DailyMetrics[]>`
          SELECT *
          FROM "DailyMetrics"
          WHERE "date" >= ${startDate}
            AND "date" <= ${endDate}
          ORDER BY "date" ASC
        `;
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get user activity metrics
   * @param period The time period ('day', 'week', 'month', 'year', 'all')
   * @returns User activity metrics
   */
  async getUserActivityMetrics(period: string = 'month'): Promise<any> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.STATS,
      `user-activity-${period}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = this.getStartDateForPeriod(period);

        // Get active users count
        const activeUsersResult = await this.prisma.$queryRaw<{count: string}[]>`
          SELECT COUNT(DISTINCT "customerId") as count
          FROM "UserSession"
          WHERE "startTime" >= ${startDate}
        `;
        const activeUsers = parseInt(activeUsersResult[0]?.count || '0', 10);

        // Get new users count
        const newUsersResult = await this.prisma.$queryRaw<{count: string}[]>`
          SELECT COUNT(*) as count
          FROM "Customer"
          WHERE "createdAt" >= ${startDate}
        `;
        const newUsers = parseInt(newUsersResult[0]?.count || '0', 10);

        // Get session metrics
        const sessions = await this.prisma.$queryRaw<UserSession[]>`
          SELECT *
          FROM "UserSession"
          WHERE "startTime" >= ${startDate}
            AND "endTime" IS NOT NULL
        `;

        // Calculate average session duration
        let totalDuration = 0;
        let sessionCount = 0;

        sessions.forEach((session: UserSession) => {
          if (session.endTime) {
            const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
            totalDuration += duration;
            sessionCount++;
          }
        });

        const avgSessionDuration = sessionCount > 0 ? totalDuration / sessionCount / 1000 : 0;

        // Get platform distribution
        const platformCounts: {[key: string]: number} = {};
        sessions.forEach((session: UserSession) => {
          const platform = session.platform || 'unknown';
          platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        return {
          activeUsers,
          newUsers,
          totalSessions: sessions.length,
          avgSessionDuration,
          platformDistribution: platformCounts,
        };
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get content engagement metrics
   * @param period The time period ('day', 'week', 'month', 'year', 'all')
   * @returns Content engagement metrics
   */
  async getContentEngagementMetrics(period: string = 'month'): Promise<any> {
    const cacheKey = this.cacheService.createKey(
      CachePrefix.STATS,
      `content-engagement-${period}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = this.getStartDateForPeriod(period);

        // Get total views by content type
        const contentViewsResult = await this.prisma.$queryRaw<{contentType: string, count: string}[]>`
          SELECT "contentType", COUNT(*) as count
          FROM "ContentView"
          WHERE "timestamp" >= ${startDate}
          GROUP BY "contentType"
        `;

        // Convert to a more usable format
        const viewsByType: {[key: string]: number} = {};
        contentViewsResult.forEach(item => {
          viewsByType[item.contentType] = parseInt(item.count, 10);
        });

        // Get total likes
        const likesResult = await this.prisma.$queryRaw<{count: string}[]>`
          SELECT COUNT(*) as count
          FROM "LikedSong"
          WHERE "createdAt" >= ${startDate}
        `;
        const totalLikes = parseInt(likesResult[0]?.count || '0', 10);

        // Get total comments
        const commentsResult = await this.prisma.$queryRaw<{count: string}[]>`
          SELECT COUNT(*) as count
          FROM "Comment"
          WHERE "createdAt" >= ${startDate}
        `;
        const totalComments = parseInt(commentsResult[0]?.count || '0', 10);

        // Get source distribution
        const sourceDistributionResult = await this.prisma.$queryRaw<{source: string, count: string}[]>`
          SELECT "source", COUNT(*) as count
          FROM "ContentView"
          WHERE "timestamp" >= ${startDate}
            AND "source" IS NOT NULL
          GROUP BY "source"
        `;

        // Convert to a more usable format
        const bySource: {[key: string]: number} = {};
        sourceDistributionResult.forEach(item => {
          bySource[item.source || 'unknown'] = parseInt(item.count, 10);
        });

        return {
          viewsByType,
          totalLikes,
          totalComments,
          sourceDistribution: bySource,
        };
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * Get a start date based on a period string
   * @param period The period ('day', 'week', 'month', 'year', 'all')
   * @returns The start date
   */
  private getStartDateForPeriod(period: string): Date {
    const now = new Date();

    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      case 'all':
      default:
        return new Date(0); // Beginning of time
    }
  }

  /**
   * Update daily metrics (should be called by a scheduled job)
   */
  async updateDailyMetrics(): Promise<void> {
    try {
      // Get yesterday's date (UTC)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Check if metrics already exist for yesterday
      const existingMetricsResult = await this.prisma.$queryRaw<DailyMetrics[]>`
        SELECT *
        FROM "DailyMetrics"
        WHERE "date" = ${yesterday}
      `;

      if (existingMetricsResult.length > 0) {
        this.logger.debug(`Daily metrics for ${yesterday.toISOString()} already exist`);
        return;
      }

      // Get start and end of yesterday
      const startOfDay = new Date(yesterday);
      const endOfDay = new Date(yesterday);
      endOfDay.setHours(23, 59, 59, 999);

      // Get active users
      const activeUsersResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(DISTINCT "customerId") as count
        FROM "UserSession"
        WHERE "startTime" >= ${startOfDay}
          AND "startTime" <= ${endOfDay}
      `;
      const activeUsers = parseInt(activeUsersResult[0]?.count || '0', 10);

      // Get new users
      const newUsersResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "Customer"
        WHERE "createdAt" >= ${startOfDay}
          AND "createdAt" <= ${endOfDay}
      `;
      const newUsers = parseInt(newUsersResult[0]?.count || '0', 10);

      // Get page views
      const pageViewsResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "PageView"
        WHERE "timestamp" >= ${startOfDay}
          AND "timestamp" <= ${endOfDay}
      `;
      const pageViews = parseInt(pageViewsResult[0]?.count || '0', 10);

      // Get content views by type
      const songViewsResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "ContentView"
        WHERE "contentType" = 'song'
          AND "timestamp" >= ${startOfDay}
          AND "timestamp" <= ${endOfDay}
      `;
      const songViews = parseInt(songViewsResult[0]?.count || '0', 10);

      const artistViewsResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "ContentView"
        WHERE "contentType" = 'artist'
          AND "timestamp" >= ${startOfDay}
          AND "timestamp" <= ${endOfDay}
      `;
      const artistViews = parseInt(artistViewsResult[0]?.count || '0', 10);

      const collectionViewsResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "ContentView"
        WHERE "contentType" = 'collection'
          AND "timestamp" >= ${startOfDay}
          AND "timestamp" <= ${endOfDay}
      `;
      const collectionViews = parseInt(collectionViewsResult[0]?.count || '0', 10);

      // Get likes
      const likesResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "LikedSong"
        WHERE "createdAt" >= ${startOfDay}
          AND "createdAt" <= ${endOfDay}
      `;
      const likes = parseInt(likesResult[0]?.count || '0', 10);

      // Get comments
      const commentsResult = await this.prisma.$queryRaw<{count: string}[]>`
        SELECT COUNT(*) as count
        FROM "Comment"
        WHERE "createdAt" >= ${startOfDay}
          AND "createdAt" <= ${endOfDay}
      `;
      const comments = parseInt(commentsResult[0]?.count || '0', 10);

      // Create daily metrics
      await this.prisma.$executeRaw`
        INSERT INTO "DailyMetrics" (
          "id", "date", "activeUsers", "newUsers", "totalPageViews",
          "totalSongViews", "totalArtistViews", "totalCollectionViews",
          "totalLikes", "totalComments"
        ) VALUES (
          gen_random_uuid(), ${yesterday}, ${activeUsers}, ${newUsers}, ${pageViews},
          ${songViews}, ${artistViews}, ${collectionViews},
          ${likes}, ${comments}
        )
      `;

      this.logger.debug(`Updated daily metrics for ${yesterday.toISOString()}`);
    } catch (error: any) {
      this.logger.error(
        `Error updating daily metrics: ${error.message}`,
        error.stack,
      );
    }
  }
}
