import {
  Controller,
  Get,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MediaService, MediaFile, MediaStats } from '../../services/media.service';
import { UserAuthGuard } from '../../guards/user-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

export class DeleteMediaFileDto {
  bucket!: string;
  path!: string;
}

export class BulkDeleteMediaFilesDto {
  files!: { bucket: string; path: string }[];
}

@ApiTags('media')
@Controller('media')
@UseGuards(UserAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRIBUTOR)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all media files from Supabase storage' })
  @ApiQuery({ name: 'bucket', required: false, description: 'Filter by bucket name' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by file type/extension' })
  @ApiQuery({ name: 'unused', required: false, type: Boolean, description: 'Show only unused files' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all media files with usage information',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          url: { type: 'string' },
          size: { type: 'number' },
          mimeType: { type: 'string' },
          bucket: { type: 'string' },
          path: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          usageCount: { type: 'number' },
          usedIn: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                id: { type: 'string' },
                title: { type: 'string' },
                field: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async getAllMediaFiles(
    @Query('bucket') bucket?: string,
    @Query('type') type?: string,
    @Query('unused') unused?: boolean,
  ): Promise<MediaFile[]> {
    let files = await this.mediaService.getAllMediaFiles();

    // Apply filters
    if (bucket) {
      files = files.filter(file => file.bucket === bucket);
    }

    if (type) {
      files = files.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return extension === type.toLowerCase();
      });
    }

    if (unused === true) {
      files = files.filter(file => file.usageCount === 0);
    }

    return files;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get media storage statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return media storage statistics',
    schema: {
      type: 'object',
      properties: {
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' },
        fileTypes: { type: 'object' },
        buckets: { type: 'object' },
        unusedFiles: { type: 'number' }
      }
    }
  })
  async getMediaStats(): Promise<MediaStats> {
    return this.mediaService.getMediaStats();
  }

  @Get('usage/:bucket/:path(*)')
  @ApiOperation({ summary: 'Get usage information for a specific file' })
  @ApiResponse({
    status: 200,
    description: 'Return file usage information',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          id: { type: 'string' },
          title: { type: 'string' },
          field: { type: 'string' }
        }
      }
    }
  })
  async getFileUsage(
    @Param('bucket') bucket: string,
    @Param('path') path: string,
  ) {
    // Reconstruct the file URL using the Supabase client
    const fileUrl = this.mediaService['supabase'].storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return this.mediaService['getFileUsage'](fileUrl);
  }

  @Delete(':bucket/:path(*)')
  @ApiOperation({ summary: 'Delete a media file from storage' })
  @ApiResponse({ 
    status: 200, 
    description: 'File deleted successfully or error message if file is in use',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - File deletion failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deleteMediaFile(
    @Param('bucket') bucket: string,
    @Param('path') path: string,
  ) {
    return this.mediaService.deleteMediaFile(bucket, path);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Delete multiple media files from storage' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bulk deletion results',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number' },
        failed: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async bulkDeleteMediaFiles(@Body() bulkDeleteDto: BulkDeleteMediaFilesDto) {
    return this.mediaService.bulkDeleteMediaFiles(bulkDeleteDto.files);
  }

  @Get('buckets')
  @ApiOperation({ summary: 'Get list of available storage buckets' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return list of storage buckets',
    schema: {
      type: 'array',
      items: { type: 'string' }
    }
  })
  async getStorageBuckets(): Promise<string[]> {
    // Return the list of buckets used in your application
    return ['media', 'karaoke', 'vocal-models'];
  }

  @Get('file-types')
  @ApiOperation({ summary: 'Get list of file types/extensions in storage' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return list of file types with counts',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' }
    }
  })
  async getFileTypes(): Promise<{ [key: string]: number }> {
    const stats = await this.mediaService.getMediaStats();
    return stats.fileTypes;
  }
}
