/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage {
  size: 'small' | 'medium' | 'large';
  format: 'webp' | 'jpg';
  buffer: Buffer;
  width: number;
  height: number;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  private readonly MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB

  private readonly sizes = {
    small: 32,
    medium: 128,
    large: 512,
  } as const;

  private readonly config = {
    jpegQuality: 85,
    webpQuality: 85,
    resizeFit: 'cover' as const,
    background: { r: 255, g: 255, b: 255 },
  };

  async processAvatar(input: Buffer): Promise<ProcessedImage[]> {
    // Check input size for DoS protection
    if (input.length > this.MAX_INPUT_SIZE) {
      throw new BadRequestException('File too large');
    }

    // Validate image
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(input).metadata();
    } catch (error) {
      this.logger.warn('Failed to read image metadata', error);
      throw new BadRequestException('Invalid image file');
    }

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Invalid image file');
    }

    if (metadata.width < 32 || metadata.height < 32) {
      throw new BadRequestException('Image must be at least 32x32 pixels');
    }

    // Generate all variants
    const variants: ProcessedImage[] = [];
    const sizeKeys = Object.keys(this.sizes) as Array<keyof typeof this.sizes>;
    const formats = ['webp', 'jpg'] as const;

    for (const sizeKey of sizeKeys) {
      const dimension = this.sizes[sizeKey];

      for (const format of formats) {
        const pipeline = sharp(input).resize(dimension, dimension, {
          fit: this.config.resizeFit,
          position: 'center',
        });

        let buffer: Buffer;
        if (format === 'webp') {
          buffer = await pipeline.webp({ quality: this.config.webpQuality }).toBuffer();
        } else {
          buffer = await pipeline
            .flatten({ background: this.config.background })
            .jpeg({ quality: this.config.jpegQuality })
            .toBuffer();
        }

        variants.push({
          size: sizeKey,
          format,
          buffer,
          width: dimension,
          height: dimension,
        });
      }
    }

    this.logger.debug(`Processed avatar into ${variants.length} variants`);
    return variants;
  }
}
