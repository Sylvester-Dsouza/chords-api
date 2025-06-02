import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Delete,
  Logger,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UploadService } from '../../services/upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post(':folder/:entityId?')
  @ApiOperation({ summary: 'Upload a file to a specific folder with optional entity ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any, // Using any to avoid type issues
    @Param('folder') folder: string,
    @Param('entityId') entityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(`Uploading file to folder: ${folder}`);

    // Validate folder
    const allowedFolders = ['song-cover', 'artist-cover', 'collection-cover', 'banner-image', 'vocals'];
    if (!allowedFolders.includes(folder)) {
      throw new BadRequestException(`Invalid folder. Must be one of: ${allowedFolders.join(', ')}`);
    }

    // Validate file type based on folder
    if (folder === 'vocals') {
      // Audio files for vocals folder
      const allowedAudioTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/m4a',
        'audio/webm'
      ];
      if (!allowedAudioTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Only audio files are allowed for vocals folder. Allowed types: ${allowedAudioTypes.join(', ')}`);
      }
    } else {
      // Image files for other folders
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }
    }

    // Validate file size based on folder
    let maxSize: number;
    if (folder === 'vocals') {
      maxSize = 50 * 1024 * 1024; // 50MB for audio files
    } else {
      maxSize = 5 * 1024 * 1024; // 5MB for image files
    }

    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds the limit of ${maxSize / (1024 * 1024)}MB`);
    }

    const url = await this.uploadService.uploadFile(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
      entityId, // Pass the entity ID to create a subfolder
    );

    if (!url) {
      throw new BadRequestException('Failed to upload file');
    }

    return { url };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a file by URL' })
  async deleteFile(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('No URL provided');
    }

    this.logger.log(`Received delete request for URL: ${url}`);

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      this.logger.error(`Invalid URL format: ${url}`);
      throw new BadRequestException('Invalid URL format');
    }

    const success = await this.uploadService.deleteFile(url);

    if (!success) {
      this.logger.error(`Failed to delete file: ${url}`);
      throw new BadRequestException('Failed to delete file');
    }

    this.logger.log(`Successfully deleted file: ${url}`);

    return { success: true };
  }
}
