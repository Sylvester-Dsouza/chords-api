import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase configuration missing. Please check your environment variables.');
      // Provide default values to satisfy TypeScript, but these won't work in production
      this.supabase = createClient('https://example.com', 'dummy-key');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Upload a file to Supabase Storage
   * @param file Buffer containing the file data
   * @param folder Folder to store the file in (e.g., 'song-cover', 'artist-cover', 'collection-cover', 'banner-image')
   * @param fileName Name of the file
   * @param contentType MIME type of the file
   * @returns URL of the uploaded file or null if upload failed
   */
  async uploadFile(
    file: Buffer,
    folder: string,
    fileName: string,
    contentType: string,
    entityId?: string,
  ): Promise<string | null> {
    try {
      this.logger.log(`Uploading file to ${folder}/${fileName}`);

      // Ensure the file name is URL-safe but preserve the original name
      const safeFileName = fileName.replace(/[^a-zA-Z0-9-_.]/g, '_');

      // Create a subfolder for the entity if an ID is provided
      let entityFolder = folder;
      if (entityId) {
        // Create a safe folder name from the entity ID
        const safeEntityId = entityId.replace(/[^a-zA-Z0-9-_]/g, '_');
        entityFolder = `${folder}/${safeEntityId}`;
        this.logger.log(`Using entity subfolder: ${entityFolder}`);
      }

      let filePath = `${entityFolder}/${safeFileName}`;

      // Check if file already exists in the entity folder
      const { data: existingFiles } = await this.supabase.storage
        .from('media')
        .list(entityFolder, {
          search: safeFileName
        });

      // If file with same name exists, add a suffix
      if (existingFiles && existingFiles.length > 0) {
        // Extract file name and extension
        const lastDotIndex = safeFileName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? safeFileName.substring(0, lastDotIndex) : safeFileName;
        const extension = lastDotIndex !== -1 ? safeFileName.substring(lastDotIndex) : '';

        // Add a timestamp suffix to make the filename unique
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueFileName = `${baseName}_${timestamp}${extension}`;
        filePath = `${entityFolder}/${uniqueFileName}`;

        this.logger.log(`File with name ${safeFileName} already exists in ${entityFolder}. Using ${uniqueFileName} instead.`);
      }

      // Upload the file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('media')
        .upload(filePath, file, {
          contentType,
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        this.logger.error(`Error uploading file to Supabase: ${error.message}`);
        return null;
      }

      // Get the public URL for the file
      const { data: urlData } = this.supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      this.logger.log(`File uploaded successfully. URL: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Exception in uploadFile: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param url URL of the file to delete
   * @returns true if deletion was successful, false otherwise
   */
  async deleteFile(url: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting file: ${url}`);

      // Parse the URL to extract the path
      const urlObj = new URL(url);

      // Example URL: https://vglfzwcblteoevqqornt.supabase.co/storage/v1/object/public/media/collection-cover/fcb9834f-ea38-4c44-8600-50ad44b9272e/cover.png
      // We need to extract: collection-cover/fcb9834f-ea38-4c44-8600-50ad44b9272e/cover.png

      // Check if this is a Supabase storage URL
      if (!urlObj.pathname.includes('/storage/') || !urlObj.pathname.includes('/object/public/')) {
        this.logger.error(`URL does not appear to be a Supabase storage URL: ${url}`);
        return false;
      }

      // Find the position of 'public/media/' in the path
      const publicMediaIndex = urlObj.pathname.indexOf('/public/media/');

      if (publicMediaIndex === -1) {
        this.logger.error(`Could not find '/public/media/' in URL path: ${urlObj.pathname}`);
        return false;
      }

      // Extract the path after '/public/media/'
      const path = urlObj.pathname.substring(publicMediaIndex + '/public/media/'.length);

      if (!path) {
        this.logger.error(`Extracted empty path from URL: ${url}`);
        return false;
      }

      this.logger.log(`Extracted path from URL: ${path}`);

      // Delete the file
      const { data, error } = await this.supabase.storage
        .from('media')
        .remove([path]);

      if (error) {
        this.logger.error(`Error deleting file from Supabase: ${error.message}`);
        this.logger.error(`Error details: ${JSON.stringify(error)}`);
        return false;
      }

      this.logger.log(`File deleted successfully. Response: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      this.logger.error(`Exception in deleteFile: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
