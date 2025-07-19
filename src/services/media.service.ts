import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  bucket: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  usedIn: MediaUsage[];
}

export interface MediaUsage {
  type: 'song' | 'collection' | 'artist' | 'banner' | 'karaoke' | 'vocal_model';
  id: string;
  title: string;
  field: string; // e.g., 'imageUrl', 'coverImage', etc.
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: { [key: string]: number };
  buckets: { [key: string]: number };
  unusedFiles: number;
}

@Injectable()
export class MediaService {
  private supabase: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async getAllMediaFiles(): Promise<MediaFile[]> {
    try {
      console.log('🚀 Starting optimized media file discovery...');

      // Get all files from Supabase storage buckets in parallel
      const buckets = ['media', 'karaoke', 'vocal-models'];

      // Process all buckets in parallel for better performance
      const bucketPromises = buckets.map(bucket => this.getAllFilesFromBucket(bucket));
      const bucketResults = await Promise.allSettled(bucketPromises);

      const allFiles: MediaFile[] = [];
      bucketResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allFiles.push(...result.value);
          console.log(`✅ Bucket ${buckets[index]}: ${result.value.length} files found`);
        } else {
          console.error(`❌ Bucket ${buckets[index]} failed:`, result.reason);
        }
      });

      console.log(`📊 Total files discovered: ${allFiles.length}`);

      // Batch process usage information for better performance
      await this.batchProcessUsageInfo(allFiles);

      return allFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting media files:', error);
      throw new BadRequestException('Failed to retrieve media files');
    }
  }

  private async getAllFilesFromBucket(bucket: string, prefix: string = ''): Promise<MediaFile[]> {
    const files: MediaFile[] = [];
    const foldersToProcess: string[] = [prefix];

    try {
      console.log(`🔍 Scanning bucket: ${bucket}`);

      // Use iterative approach instead of recursive to avoid stack overflow
      while (foldersToProcess.length > 0) {
        const currentPrefix = foldersToProcess.shift()!;

        const { data: items, error } = await this.supabase.storage
          .from(bucket)
          .list(currentPrefix, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (error) {
          console.error(`❌ Error listing ${bucket}/${currentPrefix}:`, error.message);
          continue;
        }

        if (!items) continue;

        // Separate files and folders for batch processing
        const fileItems = items.filter((item: any) => item.metadata && item.metadata.size !== undefined);
        const folderItems = items.filter((item: any) => !(item.metadata && item.metadata.size !== undefined));

        // Process files in current folder
        for (const item of fileItems) {
          const fullPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
          const fileUrl = this.supabase.storage.from(bucket).getPublicUrl(fullPath).data.publicUrl;

          const mediaFile: MediaFile = {
            id: `${bucket}/${fullPath}`,
            name: item.name,
            url: fileUrl,
            size: item.metadata?.size || 0,
            mimeType: item.metadata?.mimetype || this.getMimeTypeFromExtension(item.name),
            bucket: bucket,
            path: fullPath,
            createdAt: new Date(item.created_at || Date.now()),
            updatedAt: new Date(item.updated_at || Date.now()),
            usageCount: 0,
            usedIn: []
          };

          files.push(mediaFile);

          // Debug: Log first few file URLs
          if (files.length <= 3) {
            console.log(`🔗 Generated URL for ${item.name}: ${fileUrl}`);
          }
        }

        // Add folders to processing queue
        for (const item of folderItems) {
          const fullPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
          foldersToProcess.push(fullPath);
        }

        console.log(`📁 ${bucket}/${currentPrefix}: ${fileItems.length} files, ${folderItems.length} folders`);
      }

      console.log(`✅ Bucket ${bucket} scan complete: ${files.length} files found`);
    } catch (error) {
      console.error(`❌ Error scanning bucket ${bucket}:`, error);
    }

    return files;
  }

  private async batchProcessUsageInfo(files: MediaFile[]): Promise<void> {
    console.log('🔄 Processing usage information in batches...');

    try {
      // Get all URLs for batch processing
      const urls = files.map(file => file.url);
      console.log(`📋 Processing ${urls.length} file URLs for usage detection`);

      // Sample a few URLs for debugging
      if (urls.length > 0) {
        console.log(`🔍 Sample file URLs:`, urls.slice(0, 3));
      }

      // Debug: Check what URLs are actually in the database
      const sampleDbUrls = await this.prisma.song.findMany({
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
        take: 3
      });
      console.log(`🔍 Sample database URLs:`, sampleDbUrls.map(s => s.imageUrl));

      // Batch query all usage at once instead of one by one
      const [songs, collections, artists, banners, karaokeFiles] = await Promise.all([
        this.prisma.song.findMany({
          where: {
            imageUrl: {
              in: urls.filter(url => url != null)
            }
          },
          select: { id: true, title: true, imageUrl: true }
        }),
        this.prisma.collection.findMany({
          where: {
            imageUrl: {
              in: urls.filter(url => url != null)
            }
          },
          select: { id: true, name: true, imageUrl: true }
        }),
        this.prisma.artist.findMany({
          where: {
            imageUrl: {
              in: urls.filter(url => url != null)
            }
          },
          select: { id: true, name: true, imageUrl: true }
        }),
        this.prisma.banner.findMany({
          where: {
            imageUrl: {
              in: urls.filter(url => url != null)
            }
          },
          select: { id: true, title: true, imageUrl: true }
        }),
        // Karaoke files no longer have a single fileUrl, they use individual track files
        Promise.resolve([])
      ]);

      console.log(`📊 Database results: ${songs.length} songs, ${collections.length} collections, ${artists.length} artists, ${banners.length} banners, ${karaokeFiles.length} karaoke files`);

      // Sample some database URLs for debugging
      if (songs.length > 0) {
        console.log(`🔍 Sample song URLs from DB:`, songs.slice(0, 2).map(s => s.imageUrl));
      }

      // Create usage maps for fast lookup
      const usageMap = new Map<string, MediaUsage[]>();

      // Process songs
      songs.forEach(song => {
        if (song.imageUrl) {
          if (!usageMap.has(song.imageUrl)) usageMap.set(song.imageUrl, []);
          usageMap.get(song.imageUrl)!.push({
            type: 'song',
            id: song.id,
            title: song.title,
            field: 'imageUrl'
          });
        }
      });

      // Process collections
      collections.forEach(collection => {
        if (collection.imageUrl) {
          if (!usageMap.has(collection.imageUrl)) usageMap.set(collection.imageUrl, []);
          usageMap.get(collection.imageUrl)!.push({
            type: 'collection',
            id: collection.id,
            title: collection.name,
            field: 'imageUrl'
          });
        }
      });

      // Process artists
      artists.forEach(artist => {
        if (artist.imageUrl) {
          if (!usageMap.has(artist.imageUrl)) usageMap.set(artist.imageUrl, []);
          usageMap.get(artist.imageUrl)!.push({
            type: 'artist',
            id: artist.id,
            title: artist.name,
            field: 'imageUrl'
          });
        }
      });

      // Process banners
      banners.forEach(banner => {
        if (banner.imageUrl) {
          if (!usageMap.has(banner.imageUrl)) usageMap.set(banner.imageUrl, []);
          usageMap.get(banner.imageUrl)!.push({
            type: 'banner',
            id: banner.id,
            title: banner.title,
            field: 'imageUrl'
          });
        }
      });

      // Process karaoke files - disabled since we moved to multi-track karaoke
      // karaokeFiles.forEach(karaoke => {
      //   if (karaoke.fileUrl) {
      //     if (!usageMap.has(karaoke.fileUrl)) usageMap.set(karaoke.fileUrl, []);
      //     usageMap.get(karaoke.fileUrl)!.push({
      //       type: 'karaoke',
      //       id: karaoke.id,
      //       title: karaoke.song?.title || 'Unknown Song',
      //       field: 'fileUrl'
      //     });
      //   }
      // });

      console.log(`🗺️ Usage map created with ${usageMap.size} unique URLs`);

      // Apply usage information to files
      let filesWithUsage = 0;
      files.forEach(file => {
        const usage = usageMap.get(file.url) || [];
        file.usedIn = usage;
        file.usageCount = usage.length;
        if (usage.length > 0) {
          filesWithUsage++;
          console.log(`✅ File ${file.name} used in ${usage.length} places: ${usage.map(u => u.type).join(', ')}`);
        }
      });

      console.log(`✅ Usage processing complete: ${filesWithUsage} files in use out of ${files.length} total files`);
    } catch (error) {
      console.error('❌ Error processing usage information:', error);
    }
  }

  private getMimeTypeFromExtension(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',

      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4',

      // Video
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',

      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'rtf': 'application/rtf',

      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  // Removed individual findFileUsage method - now using batch processing for better performance

  async getMediaStats(): Promise<MediaStats> {
    const files = await this.getAllMediaFiles();
    
    const stats: MediaStats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      fileTypes: {},
      buckets: {},
      unusedFiles: files.filter(file => file.usageCount === 0).length
    };

    files.forEach(file => {
      // Count file types
      const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;

      // Count buckets
      stats.buckets[file.bucket] = (stats.buckets[file.bucket] || 0) + 1;
    });

    return stats;
  }

  async deleteMediaFile(bucket: string, path: string): Promise<{ success: boolean; message: string }> {
    try {
      // First check if file is in use
      const fileUrl = this.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      const usage = await this.getFileUsage(fileUrl);

      if (usage.length > 0) {
        return {
          success: false,
          message: `Cannot delete file. It is currently used in ${usage.length} item(s): ${usage.map((u: MediaUsage) => `${u.type} "${u.title}"`).join(', ')}`
        };
      }

      // Delete from Supabase storage
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting media file:', error);
      throw new BadRequestException(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getFileUsage(fileUrl: string): Promise<MediaUsage[]> {
    const usage: MediaUsage[] = [];

    try {
      const [songs, collections, artists, banners, karaokeFiles] = await Promise.all([
        this.prisma.song.findMany({
          where: { imageUrl: fileUrl },
          select: { id: true, title: true }
        }),
        this.prisma.collection.findMany({
          where: { imageUrl: fileUrl },
          select: { id: true, name: true }
        }),
        this.prisma.artist.findMany({
          where: { imageUrl: fileUrl },
          select: { id: true, name: true }
        }),
        this.prisma.banner.findMany({
          where: { imageUrl: fileUrl },
          select: { id: true, title: true }
        }),
        // Karaoke files no longer have a single fileUrl
        Promise.resolve([])
      ]);

      // Process results
      songs.forEach(song => usage.push({ type: 'song', id: song.id, title: song.title, field: 'imageUrl' }));
      collections.forEach(collection => usage.push({ type: 'collection', id: collection.id, title: collection.name, field: 'imageUrl' }));
      artists.forEach(artist => usage.push({ type: 'artist', id: artist.id, title: artist.name, field: 'imageUrl' }));
      banners.forEach(banner => usage.push({ type: 'banner', id: banner.id, title: banner.title, field: 'imageUrl' }));
      // karaokeFiles.forEach(karaoke => usage.push({ type: 'karaoke', id: karaoke.id, title: karaoke.song?.title || 'Unknown Song', field: 'fileUrl' }));

    } catch (error) {
      console.error('Error finding file usage:', error);
    }

    return usage;
  }

  async bulkDeleteMediaFiles(files: { bucket: string; path: string }[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await this.deleteMediaFile(file.bucket, file.path);
        if (result.success) {
          success++;
        } else {
          failed++;
          errors.push(`${file.path}: ${result.message}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }
}
