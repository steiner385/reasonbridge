import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImageProcessorService, ProcessedImage } from './image-processor.service';
import * as fs from 'fs';
import * as path from 'path';

describe('ImageProcessorService', () => {
  let service: ImageProcessorService;
  const fixturesDir = path.join(__dirname, '../../test/fixtures');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessorService],
    }).compile();
    service = module.get<ImageProcessorService>(ImageProcessorService);
  });

  describe('processAvatar', () => {
    it('should produce 6 variants from valid JPEG', async () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'valid-avatar.jpg'));
      const result = await service.processAvatar(input);

      expect(result).toHaveLength(6);

      // Check all size/format combinations
      const sizes = ['small', 'medium', 'large'] as const;
      const formats = ['webp', 'jpg'] as const;

      for (const size of sizes) {
        for (const format of formats) {
          const variant = result.find((v) => v.size === size && v.format === format);
          expect(variant).toBeDefined();
          expect(variant!.buffer).toBeInstanceOf(Buffer);
          expect(variant!.buffer.length).toBeGreaterThan(0);
        }
      }
    });

    it('should produce correct dimensions for each size', async () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'valid-avatar.jpg'));
      const result = await service.processAvatar(input);

      const expectedDimensions = { small: 32, medium: 128, large: 512 };

      for (const variant of result) {
        const expected = expectedDimensions[variant.size];
        expect(variant.width).toBe(expected);
        expect(variant.height).toBe(expected);
      }
    });

    it('should process PNG with transparency', async () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'valid-avatar.png'));
      const result = await service.processAvatar(input);

      expect(result).toHaveLength(6);
      // WebP preserves alpha, JPG gets white background
    });

    it('should throw for image smaller than 32x32', async () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'tiny-avatar.jpg'));

      await expect(service.processAvatar(input)).rejects.toThrow(BadRequestException);
      await expect(service.processAvatar(input)).rejects.toThrow(
        'Image must be at least 32x32 pixels',
      );
    });

    it('should throw for corrupt/invalid image', async () => {
      const input = fs.readFileSync(path.join(fixturesDir, 'corrupt.jpg'));

      await expect(service.processAvatar(input)).rejects.toThrow(BadRequestException);
      await expect(service.processAvatar(input)).rejects.toThrow('Invalid image file');
    });

    it('should throw for files larger than 10MB', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(service.processAvatar(largeBuffer)).rejects.toThrow(BadRequestException);
      await expect(service.processAvatar(largeBuffer)).rejects.toThrow('File too large');
    });
  });
});
