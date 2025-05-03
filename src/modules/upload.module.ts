import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from '../controllers/upload/upload.controller';
import { UploadService } from '../services/upload.service';
import { SupabaseModule } from './supabase.module';

@Module({
  imports: [
    SupabaseModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService, MulterModule],
})
export class UploadModule {}
