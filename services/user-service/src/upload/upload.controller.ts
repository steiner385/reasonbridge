import {
  Controller,
  Post,
  BadRequestException,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { UploadService } from './upload.service.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

interface UploadAvatarDto {
  file: string; // Base64 encoded file
  mimetype: string;
}

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload avatar for a user
   * Accepts base64-encoded file data in the request body
   */
  @Post('avatar/:userId')
  async uploadAvatar(@Param('userId') userId: string, @Body() dto: UploadAvatarDto) {
    if (!dto.file) {
      throw new BadRequestException('No file data provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(dto.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(dto.file, 'base64');

    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const result = await this.uploadService.uploadAvatar(userId, fileBuffer, dto.mimetype);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Delete avatar by key
   */
  @Delete('avatar/:key(.*)')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(@Param('key') key: string) {
    await this.uploadService.deleteAvatar(key);
  }
}
