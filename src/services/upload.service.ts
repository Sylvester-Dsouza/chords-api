import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Upload a file to Supabase Storage
   * @param buffer File buffer
   * @param folder Folder to upload to (song-cover, artist-cover, collection-cover)
   * @param originalName Original file name
   * @param mimeType MIME type of the file
   * @returns URL of the uploaded file or null if upload failed
   */
  async uploadFile(
    buffer: Buffer,
    folder: string,
    originalName: string,
    mimeType: string,
    entityId?: string,
  ): Promise<string | null> {
    this.logger.log(`Uploading file: ${originalName} to ${folder}`);

    try {
      return await this.supabaseService.uploadFile(
        buffer,
        folder,
        originalName,
        mimeType,
        entityId,
      );
    } catch (error) {
      this.logger.error(`Error uploading file: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param url URL of the file to delete
   * @returns true if deletion was successful, false otherwise
   */
  async deleteFile(url: string): Promise<boolean> {
    this.logger.log(`Deleting file: ${url}`);

    try {
      return await this.supabaseService.deleteFile(url);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
