import { Module } from '@nestjs/common';
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
import { PlaylistModule } from './modules/playlist.module';
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
import { CommentModule } from './modules/comment.module';
import { SongRatingModule } from './modules/song-rating.module';
import { HealthController } from './controllers/health/health.controller';

import { PlaylistService } from './services/playlist.service';
import { LikedSongService } from './services/liked-song.service';
import { SongRequestService } from './services/song-request.service';
import { NotificationHistoryService } from './services/notification-history.service';
import { NotificationService } from './services/notification.service';
import { CommentService } from './services/comment.service';
import { SongRatingService } from './services/song-rating.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CustomerAuthModule,
    UserAuthModule,
    ArtistModule,
    SongModule,
    CollectionModule,
    PlaylistModule,
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
    SongRatingModule
  ],
  controllers: [
    AppController,
    UserController,
    CustomerController,
    HealthController
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
    TokenService,
    AuditLogService,
    PlaylistService,
    LikedSongService,
    SongRequestService,
    NotificationHistoryService,
    NotificationService,
    CommentService,
    SongRatingService
  ],
})
export class AppModule {}
