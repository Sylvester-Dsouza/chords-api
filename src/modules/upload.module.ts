import { Module } from '@nestjs/common';
import { UploadController } from '../controllers/upload/upload.controller';
import { UploadService } from '../services/upload.service';
import { SupabaseModule } from './supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
