import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './controllers/user/user.controller';
import { CustomerController } from './controllers/customer/customer.controller';
import { UserService } from './services/user.service';
import { CustomerService } from './services/customer.service';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { CacheService } from './services/cache.service';
import { ChordDiagramService } from './services/chord-diagram.service';
import { CustomerAuthModule } from './modules/customer-auth.module';
import { UserAuthModule } from './modules/user-auth.module';
import { ArtistModule } from './modules/artist.module';
import { SongModule } from './modules/song.module';
import { ChordDiagramModule } from './modules/chord-diagram.module';
import { AnalyticsModule } from './modules/analytics.module';
import { SystemMonitoringModule } from './modules/system-monitoring.module';
import { RateLimitMiddleware } from './middlewares/rate-limit.middleware';
import { RequestValidationMiddleware } from './middlewares/request-validation.middleware';
import { TokenService } from './services/token.service';
import { AuditLogService } from './services/audit-log.service';
import { CollectionModule } from './modules/collection.module';
import { SetlistModule } from './modules/setlist.module';
import { LikedSongModule } from './modules/liked-song.module';
import { TagModule } from './modules/tag.module';
import { LanguageModule } from './modules/language.module';
import { SubscriptionPlanModule } from './modules/subscription-plan.module';
import { SubscriptionModule } from './modules/subscription.module';
import { TransactionModule } from './modules/transaction.module';
import { AdsModule } from './modules/ads.module';
import { AuthModule } from './modules/auth.module';
import { SupabaseModule } from './modules/supabase.module';
import { UploadModule } from './modules/upload.module';
import { SongRequestModule } from './modules/song-request.module';
import { NotificationModule } from './modules/notification.module';
import { HealthModule } from './health/health.module';
import { CommentModule } from './modules/comment.module';
import { SongRatingModule } from './modules/song-rating.module';
import { HomeSectionModule } from './modules/home-section.module';
import { CoursesModule } from './modules/courses.module';
import { VocalModule } from './modules/vocal.module';
import { CommunityModule } from './modules/community.module';
import { CacheModule } from './modules/cache.module';
import { KaraokeModule } from './modules/karaoke.module';
import { HealthController } from './controllers/health/health.controller';

import { SetlistService } from './services/setlist.service';
import { LikedSongService } from './services/liked-song.service';
import { SongRequestService } from './services/song-request.service';
import { NotificationHistoryService } from './services/notification-history.service';
import { NotificationService } from './services/notification.service';
import { CommentService } from './services/comment.service';
import { SongRatingService } from './services/song-rating.service';
import { HomeSectionService } from './services/home-section.service';
import { BannerItemService } from './services/banner-item.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60,               // Time window in seconds
        limit: 100,            // Max number of requests in the time window
      },
      {
        name: 'medium',
        ttl: 300,              // 5 minutes
        limit: 300,            // Higher limit for longer window
      },
    ]),
    CustomerAuthModule,
    UserAuthModule,
    ArtistModule,
    SongModule,
    CollectionModule,
    SetlistModule,
    ChordDiagramModule,
    AnalyticsModule,
    SystemMonitoringModule,
    LikedSongModule,
    TagModule,
    LanguageModule,
    SubscriptionPlanModule,
    SubscriptionModule,
    TransactionModule,
    AdsModule,
    AuthModule,
    SupabaseModule,
    UploadModule,
    SongRequestModule,
    NotificationModule,
    CommentModule,
    SongRatingModule,
    HomeSectionModule,
    CoursesModule,
    VocalModule,
    CommunityModule,
    CacheModule,
    KaraokeModule,
    HealthModule
  ],
  controllers: [
    AppController,
    UserController,
    CustomerController
  ],
  providers: [
    AppService,
    UserService,
    CustomerService,
    PrismaService,
    RedisService,
    CacheService,
    ChordDiagramService,
    RateLimitMiddleware,
    RequestValidationMiddleware,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    TokenService,
    AuditLogService,
    SetlistService,
    LikedSongService,
    SongRequestService,
    NotificationHistoryService,
    // NotificationService removed - provided by NotificationModule
    CommentService,
    SongRatingService,
    HomeSectionService,
    BannerItemService
  ],
})
export class AppModule {}
