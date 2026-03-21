# Avatar Image Resizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically resize uploaded avatar images into 6 optimized variants (3 sizes × 2 formats) for bandwidth efficiency and appropriate UI sizing.

**Architecture:** New `ImageProcessorService` handles Sharp-based resizing. Modified `UploadService` orchestrates the flow: validate → process → upload variants → update DB → cleanup old. Frontend `Avatar` component uses `<picture>` element for WebP/JPEG fallback.

**Tech Stack:** Sharp 0.33.x (image processing), AWS S3 (storage), Prisma (database), React (frontend)

**Spec Reference:** `docs/superpowers/specs/2026-03-21-avatar-image-resizing-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `services/user-service/src/services/image-processor.service.ts` | **Create** - Sharp-based image resizing (3 sizes × 2 formats) |
| `services/user-service/src/services/image-processor.service.spec.ts` | **Create** - Unit tests for image processing |
| `services/user-service/src/services/s3.service.ts` | **Modify** - Add `uploadAvatarVariants()` and `deleteAvatarFolder()` |
| `services/user-service/src/services/s3.service.spec.ts` | **Modify** - Tests for new S3 methods |
| `services/user-service/src/upload/upload.service.ts` | **Modify** - Integrate image processing flow |
| `services/user-service/src/upload/upload.service.spec.ts` | **Modify** - Tests for new upload flow |
| `services/user-service/src/users/users.service.ts` | **Modify** - Add `updateAvatarUrls()` method |
| `packages/db-models/prisma/schema.prisma` | **Modify** - Add `avatarUrls` and `avatarHash` fields |
| `frontend/src/types/user.ts` | **Modify** - Add `AvatarUrls` interface |
| `frontend/src/components/ui/Avatar.tsx` | **Modify** - Add `<picture>` element support |

---

## Task 1: Add Sharp Dependency

**Files:**
- Modify: `services/user-service/package.json`

- [ ] **Step 1: Add sharp to dependencies**

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm add sharp@^0.33.0
```

- [ ] **Step 2: Add @types/sharp for TypeScript**

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm add -D @types/sharp
```

- [ ] **Step 3: Verify installation**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm list sharp`
Expected: `sharp 0.33.x`

- [ ] **Step 4: Commit**

```bash
git add services/user-service/package.json services/user-service/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore(user-service): add sharp dependency for image processing"
```

---

## Task 2: Create Test Fixtures

**Files:**
- Create: `services/user-service/test/fixtures/valid-avatar.jpg`
- Create: `services/user-service/test/fixtures/valid-avatar.png`
- Create: `services/user-service/test/fixtures/tiny-avatar.jpg`
- Create: `services/user-service/test/fixtures/corrupt.jpg`

- [ ] **Step 1: Create fixtures directory**

```bash
mkdir -p /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service/test/fixtures
```

- [ ] **Step 2: Generate valid JPEG test image (100x100)**

Use Sharp to create test fixtures programmatically. Create a script:

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && node -e "
const sharp = require('sharp');

// Create 100x100 red square JPEG
sharp({
  create: {
    width: 100,
    height: 100,
    channels: 3,
    background: { r: 255, g: 100, b: 100 }
  }
})
.jpeg({ quality: 90 })
.toFile('test/fixtures/valid-avatar.jpg')
.then(() => console.log('Created valid-avatar.jpg'));
"
```

- [ ] **Step 3: Generate valid PNG test image with transparency (100x100)**

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && node -e "
const sharp = require('sharp');

// Create 100x100 blue square PNG with alpha
sharp({
  create: {
    width: 100,
    height: 100,
    channels: 4,
    background: { r: 100, g: 100, b: 255, alpha: 0.8 }
  }
})
.png()
.toFile('test/fixtures/valid-avatar.png')
.then(() => console.log('Created valid-avatar.png'));
"
```

- [ ] **Step 4: Generate tiny JPEG test image (16x16 - should be rejected)**

```bash
cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && node -e "
const sharp = require('sharp');

sharp({
  create: {
    width: 16,
    height: 16,
    channels: 3,
    background: { r: 200, g: 200, b: 200 }
  }
})
.jpeg()
.toFile('test/fixtures/tiny-avatar.jpg')
.then(() => console.log('Created tiny-avatar.jpg'));
"
```

- [ ] **Step 5: Generate corrupt JPEG test file**

```bash
echo "not a real image file, just random bytes for testing" > /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service/test/fixtures/corrupt.jpg
```

- [ ] **Step 6: Commit fixtures**

```bash
git add services/user-service/test/fixtures/
git commit -m "test(user-service): add image fixtures for avatar processing tests"
```

---

## Task 3: Create ImageProcessorService with TDD

**Files:**
- Create: `services/user-service/src/services/image-processor.service.ts`
- Create: `services/user-service/src/services/image-processor.service.spec.ts`

- [ ] **Step 1: Write the failing test file**

Create `services/user-service/src/services/image-processor.service.spec.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessorService, ProcessedImage } from './image-processor.service.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ImageProcessorService', () => {
  let service: ImageProcessorService;
  let validJpegBuffer: Buffer;
  let validPngBuffer: Buffer;
  let tinyImageBuffer: Buffer;
  let corruptBuffer: Buffer;

  beforeAll(() => {
    const fixturesPath = path.join(__dirname, '../../test/fixtures');
    validJpegBuffer = fs.readFileSync(path.join(fixturesPath, 'valid-avatar.jpg'));
    validPngBuffer = fs.readFileSync(path.join(fixturesPath, 'valid-avatar.png'));
    tinyImageBuffer = fs.readFileSync(path.join(fixturesPath, 'tiny-avatar.jpg'));
    corruptBuffer = fs.readFileSync(path.join(fixturesPath, 'corrupt.jpg'));
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessorService],
    }).compile();

    service = module.get<ImageProcessorService>(ImageProcessorService);
  });

  describe('processAvatar', () => {
    it('should produce 6 variants from valid JPEG', async () => {
      const variants = await service.processAvatar(validJpegBuffer);

      expect(variants).toHaveLength(6);

      // Check all size/format combinations exist
      const combinations = variants.map((v) => `${v.size}-${v.format}`);
      expect(combinations).toContain('small-webp');
      expect(combinations).toContain('small-jpg');
      expect(combinations).toContain('medium-webp');
      expect(combinations).toContain('medium-jpg');
      expect(combinations).toContain('large-webp');
      expect(combinations).toContain('large-jpg');
    });

    it('should produce correct dimensions for each size', async () => {
      const variants = await service.processAvatar(validJpegBuffer);

      const small = variants.find((v) => v.size === 'small');
      const medium = variants.find((v) => v.size === 'medium');
      const large = variants.find((v) => v.size === 'large');

      expect(small?.width).toBe(32);
      expect(small?.height).toBe(32);
      expect(medium?.width).toBe(128);
      expect(medium?.height).toBe(128);
      expect(large?.width).toBe(512);
      expect(large?.height).toBe(512);
    });

    it('should handle PNG with transparency', async () => {
      const variants = await service.processAvatar(validPngBuffer);

      expect(variants).toHaveLength(6);

      // WebP should preserve alpha, JPG should have white background
      const webpVariant = variants.find((v) => v.format === 'webp');
      const jpgVariant = variants.find((v) => v.format === 'jpg');

      expect(webpVariant?.buffer).toBeDefined();
      expect(jpgVariant?.buffer).toBeDefined();
    });

    it('should throw error for image smaller than 32x32', async () => {
      await expect(service.processAvatar(tinyImageBuffer)).rejects.toThrow(
        'Image must be at least 32x32 pixels',
      );
    });

    it('should throw error for corrupt/invalid image', async () => {
      await expect(service.processAvatar(corruptBuffer)).rejects.toThrow('Invalid image file');
    });

    it('should return buffers for all variants', async () => {
      const variants = await service.processAvatar(validJpegBuffer);

      for (const variant of variants) {
        expect(variant.buffer).toBeInstanceOf(Buffer);
        expect(variant.buffer.length).toBeGreaterThan(0);
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="image-processor.service.spec" --no-coverage`
Expected: FAIL with "Cannot find module './image-processor.service.js'"

- [ ] **Step 3: Write minimal implementation**

Create `services/user-service/src/services/image-processor.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';

export type ImageSize = 'small' | 'medium' | 'large';
export type ImageFormat = 'webp' | 'jpg';

export interface ProcessedImage {
  size: ImageSize;
  format: ImageFormat;
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Service for processing avatar images into multiple optimized variants.
 *
 * Generates 6 variants: 3 sizes (32x32, 128x128, 512x512) × 2 formats (WebP, JPEG)
 */
@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  private readonly sizes: Record<ImageSize, number> = {
    small: 32,
    medium: 128,
    large: 512,
  };

  private readonly config = {
    jpegQuality: 85,
    webpQuality: 85,
    resizeFit: 'cover' as const,
    stripMetadata: true,
    background: { r: 255, g: 255, b: 255 },
  };

  /**
   * Process an avatar image into 6 optimized variants
   *
   * @param input - Raw image buffer (JPEG, PNG, WebP, or GIF)
   * @returns Array of 6 processed images (3 sizes × 2 formats)
   * @throws BadRequestException if image is invalid or too small
   */
  async processAvatar(input: Buffer): Promise<ProcessedImage[]> {
    // Validate the image can be read by Sharp
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(input).metadata();
    } catch {
      this.logger.warn('Failed to read image metadata - invalid image file');
      throw new BadRequestException('Invalid image file');
    }

    // Check minimum dimensions
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width < 32 || height < 32) {
      throw new BadRequestException('Image must be at least 32x32 pixels');
    }

    this.logger.debug(`Processing image: ${width}x${height}, format: ${metadata.format}`);

    // Generate all 6 variants
    const variants: ProcessedImage[] = [];
    const sizeKeys = Object.keys(this.sizes) as ImageSize[];
    const formats: ImageFormat[] = ['webp', 'jpg'];

    for (const size of sizeKeys) {
      const dimension = this.sizes[size];

      for (const format of formats) {
        const processed = await this.processVariant(input, dimension, format);
        variants.push({
          size,
          format,
          buffer: processed,
          width: dimension,
          height: dimension,
        });
      }
    }

    this.logger.log(`Generated ${variants.length} avatar variants`);
    return variants;
  }

  /**
   * Process a single variant at specified size and format
   */
  private async processVariant(
    input: Buffer,
    dimension: number,
    format: ImageFormat,
  ): Promise<Buffer> {
    let pipeline = sharp(input)
      .resize(dimension, dimension, {
        fit: this.config.resizeFit,
        position: 'centre',
      })
      .removeAlpha(); // Remove alpha for consistent sizing

    // Strip metadata for privacy
    if (this.config.stripMetadata) {
      pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip
    }

    if (format === 'webp') {
      // For WebP, flatten with white background (consistent with JPG)
      pipeline = pipeline.flatten({ background: this.config.background });
      return pipeline.webp({ quality: this.config.webpQuality }).toBuffer();
    } else {
      // For JPEG, flatten with white background
      pipeline = pipeline.flatten({ background: this.config.background });
      return pipeline.jpeg({ quality: this.config.jpegQuality }).toBuffer();
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="image-processor.service.spec" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/services/image-processor.service.ts services/user-service/src/services/image-processor.service.spec.ts
git commit -m "feat(user-service): add ImageProcessorService for avatar resizing

- Process avatars into 6 variants (3 sizes × 2 formats)
- Sizes: 32x32 (small), 128x128 (medium), 512x512 (large)
- Formats: WebP and JPEG with quality 85
- Strip EXIF metadata for privacy
- Validate minimum 32x32 dimensions"
```

---

## Task 4: Update Prisma Schema

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma`

- [ ] **Step 1: Add new fields to User model**

Edit `packages/db-models/prisma/schema.prisma`, find the User model and add after `avatarS3Key`:

```prisma
  // New avatar fields for resized variants
  avatarUrls                Json?               @map("avatar_urls")
  avatarHash                String?             @map("avatar_hash")
```

- [ ] **Step 2: Generate migration**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/packages/db-models && pnpm prisma migrate dev --name add_avatar_resizing_fields`
Expected: Migration created successfully

- [ ] **Step 3: Generate Prisma client**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/packages/db-models && pnpm prisma generate`
Expected: Prisma Client generated

- [ ] **Step 4: Commit**

```bash
git add packages/db-models/prisma/schema.prisma packages/db-models/prisma/migrations/
git commit -m "feat(db): add avatarUrls and avatarHash fields for resized avatars"
```

---

## Task 5: Add S3Service Methods with TDD

**Files:**
- Modify: `services/user-service/src/services/s3.service.ts`
- Modify: `services/user-service/src/services/s3.service.spec.ts`

- [ ] **Step 1: Add AvatarUrls interface to s3.service.ts**

Add after the `UploadResult` interface in `services/user-service/src/services/s3.service.ts`:

```typescript
export interface AvatarSizeUrls {
  webp: string;
  jpg: string;
}

export interface AvatarUrls {
  small: AvatarSizeUrls;
  medium: AvatarSizeUrls;
  large: AvatarSizeUrls;
}
```

- [ ] **Step 2: Write failing tests for new S3 methods**

Add to `services/user-service/src/services/s3.service.spec.ts`:

```typescript
describe('uploadAvatarVariants', () => {
  it('should upload all 6 variants and return structured URLs', async () => {
    const mockVariants: ProcessedImage[] = [
      { size: 'small', format: 'webp', buffer: Buffer.from('small-webp'), width: 32, height: 32 },
      { size: 'small', format: 'jpg', buffer: Buffer.from('small-jpg'), width: 32, height: 32 },
      { size: 'medium', format: 'webp', buffer: Buffer.from('medium-webp'), width: 128, height: 128 },
      { size: 'medium', format: 'jpg', buffer: Buffer.from('medium-jpg'), width: 128, height: 128 },
      { size: 'large', format: 'webp', buffer: Buffer.from('large-webp'), width: 512, height: 512 },
      { size: 'large', format: 'jpg', buffer: Buffer.from('large-jpg'), width: 512, height: 512 },
    ];

    const result = await service.uploadAvatarVariants('user-123', 'abc12345', mockVariants);

    expect(result.small.webp).toContain('user-123/abc12345/small.webp');
    expect(result.small.jpg).toContain('user-123/abc12345/small.jpg');
    expect(result.medium.webp).toContain('user-123/abc12345/medium.webp');
    expect(result.medium.jpg).toContain('user-123/abc12345/medium.jpg');
    expect(result.large.webp).toContain('user-123/abc12345/large.webp');
    expect(result.large.jpg).toContain('user-123/abc12345/large.jpg');
  });
});

describe('deleteAvatarFolder', () => {
  it('should delete all objects in the avatar folder', async () => {
    await expect(service.deleteAvatarFolder('user-123', 'abc12345')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="s3.service.spec" --no-coverage`
Expected: FAIL - methods do not exist

- [ ] **Step 4: Implement uploadAvatarVariants method**

Add to `S3Service` class in `services/user-service/src/services/s3.service.ts`:

```typescript
// Update the existing import at the top of the file to include ListObjectsV2Command:
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// Add import for ProcessedImage type:
import type { ProcessedImage } from './image-processor.service.js';

// Add method to S3Service class:

/**
 * Upload avatar variants to S3 with proper headers
 * @param userId - User ID for namespacing
 * @param hash - Content hash for the folder name
 * @param variants - Array of processed image variants
 * @returns Structured URLs for all variants
 */
async uploadAvatarVariants(
  userId: string,
  hash: string,
  variants: ProcessedImage[],
): Promise<AvatarUrls> {
  const urls: Partial<AvatarUrls> = {};
  const uploadedKeys: string[] = []; // Track uploaded keys for rollback

  for (const variant of variants) {
    const ext = variant.format === 'webp' ? 'webp' : 'jpg';
    const contentType = variant.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const key = `avatars/${userId}/${hash}/${variant.size}.${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: variant.buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          userId,
          size: variant.size,
          format: variant.format,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      uploadedKeys.push(key); // Track for potential rollback

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      // Build the nested structure
      if (!urls[variant.size]) {
        urls[variant.size] = { webp: '', jpg: '' };
      }
      urls[variant.size]![variant.format === 'webp' ? 'webp' : 'jpg'] = url;

      this.logger.debug(`Uploaded avatar variant: ${key}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload avatar variant ${key}: ${errorMessage}`);

      // Rollback: delete any successfully uploaded variants
      if (uploadedKeys.length > 0) {
        this.logger.warn(`Rolling back ${uploadedKeys.length} uploaded variants`);
        for (const uploadedKey of uploadedKeys) {
          try {
            await this.s3Client.send(new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: uploadedKey,
            }));
          } catch (rollbackError) {
            this.logger.error(`Failed to rollback ${uploadedKey}: ${rollbackError}`);
          }
        }
      }

      throw new Error(`Failed to upload avatar variant: ${errorMessage}`);
    }
  }

  this.logger.log(`Uploaded ${variants.length} avatar variants for user ${userId}`);

  return urls as AvatarUrls;
}

/**
 * Delete all avatar variants in a folder
 * @param userId - User ID
 * @param hash - Content hash identifying the folder
 */
async deleteAvatarFolder(userId: string, hash: string): Promise<void> {
  const prefix = `avatars/${userId}/${hash}/`;

  try {
    // List all objects with the prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const listResult = await this.s3Client.send(listCommand);
    const objects = listResult.Contents ?? [];

    // Delete each object
    for (const obj of objects) {
      if (obj.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: obj.Key,
        });
        await this.s3Client.send(deleteCommand);
        this.logger.debug(`Deleted avatar object: ${obj.Key}`);
      }
    }

    this.logger.log(`Deleted avatar folder: ${prefix} (${objects.length} objects)`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to delete avatar folder ${prefix}: ${errorMessage}`);
    throw new Error(`Failed to delete avatar folder: ${errorMessage}`);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="s3.service.spec" --no-coverage`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add services/user-service/src/services/s3.service.ts services/user-service/src/services/s3.service.spec.ts
git commit -m "feat(user-service): add S3 methods for avatar variant upload and folder deletion

- uploadAvatarVariants: batch upload with proper Content-Type and Cache-Control
- deleteAvatarFolder: clean up all variants when replacing/removing avatar"
```

---

## Task 6: Add UsersService Methods with TDD

**Files:**
- Modify: `services/user-service/src/users/users.service.ts`
- Modify: `services/user-service/src/users/users.service.spec.ts`

- [ ] **Step 1: Write failing tests for new methods**

Add to `services/user-service/src/users/users.service.spec.ts`:

```typescript
describe('updateAvatarUrls', () => {
  const mockAvatarUrls = {
    small: { webp: 'https://s3/small.webp', jpg: 'https://s3/small.jpg' },
    medium: { webp: 'https://s3/medium.webp', jpg: 'https://s3/medium.jpg' },
    large: { webp: 'https://s3/large.webp', jpg: 'https://s3/large.jpg' },
  };

  it('should update user with avatarUrls and avatarHash', async () => {
    const userId = 'valid-uuid-here';
    mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
    mockPrisma.user.update.mockResolvedValue({
      id: userId,
      avatarUrls: mockAvatarUrls,
      avatarHash: 'abc12345',
      avatarUrl: mockAvatarUrls.medium.jpg,
    });

    const result = await service.updateAvatarUrls(userId, mockAvatarUrls, 'abc12345');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: expect.objectContaining({
        avatarUrls: mockAvatarUrls,
        avatarHash: 'abc12345',
        avatarUrl: mockAvatarUrls.medium.jpg,
      }),
    });
    expect(result.avatarHash).toBe('abc12345');
  });

  it('should throw BadRequestException for invalid UUID', async () => {
    await expect(service.updateAvatarUrls('invalid', mockAvatarUrls, 'hash')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('getAvatarHash', () => {
  it('should return avatarHash when user has one', async () => {
    const userId = 'valid-uuid-here';
    mockPrisma.user.findUnique.mockResolvedValue({ avatarHash: 'abc12345' });

    const result = await service.getAvatarHash(userId);

    expect(result).toBe('abc12345');
  });

  it('should return null when user has no avatarHash', async () => {
    const userId = 'valid-uuid-here';
    mockPrisma.user.findUnique.mockResolvedValue({ avatarHash: null });

    const result = await service.getAvatarHash(userId);

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="users.service.spec" --no-coverage`
Expected: FAIL - methods do not exist

- [ ] **Step 3: Add updateAvatarUrls method**

Add to `UsersService` class in `services/user-service/src/users/users.service.ts`:

```typescript
import type { AvatarUrls } from '../services/s3.service.js';

// Add method:

/**
 * Update a user's avatar URLs and hash (for new resized avatar system)
 * @param userId - The user's UUID
 * @param avatarUrls - Structured URLs for all avatar variants
 * @param avatarHash - Hash for identifying the S3 folder
 * @returns Updated user object
 */
async updateAvatarUrls(userId: string, avatarUrls: AvatarUrls, avatarHash: string) {
  if (!isValidUUID(userId)) {
    throw new BadRequestException(`Invalid user ID format: expected UUID`);
  }

  // Verify user exists
  await this.findById(userId);

  const updatedUser = await this.prisma.user.update({
    where: { id: userId },
    data: {
      avatarUrls: avatarUrls as unknown as Prisma.InputJsonValue,
      avatarHash,
      // Also set legacy field for backwards compatibility
      avatarUrl: avatarUrls.medium.jpg,
    },
  });

  this.logger.log(`Avatar URLs updated for user ${userId}`);

  return updatedUser;
}

/**
 * Get a user's current avatar hash (for cleanup when replacing)
 * @param userId - The user's UUID
 * @returns The avatar hash or null if no avatar exists
 */
async getAvatarHash(userId: string): Promise<string | null> {
  if (!isValidUUID(userId)) {
    throw new BadRequestException(`Invalid user ID format: expected UUID`);
  }

  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { avatarHash: true },
  });

  return user?.avatarHash ?? null;
}
```

- [ ] **Step 2: Add Prisma import if needed**

Ensure `Prisma` is imported at the top of the file:

```typescript
import { Prisma } from '@prisma/client';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="users.service.spec" --no-coverage`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add services/user-service/src/users/users.service.ts services/user-service/src/users/users.service.spec.ts
git commit -m "feat(user-service): add updateAvatarUrls and getAvatarHash methods

- updateAvatarUrls: store structured avatar URLs and hash
- getAvatarHash: retrieve hash for S3 folder cleanup
- Also sets legacy avatarUrl field for backwards compatibility"
```

---

## Task 7: Update UploadService with TDD

**Files:**
- Modify: `services/user-service/src/upload/upload.service.ts`
- Modify: `services/user-service/src/upload/upload.service.spec.ts`

- [ ] **Step 1: Write failing tests for new upload flow**

Add to `services/user-service/src/upload/upload.service.spec.ts`:

```typescript
import { ImageProcessorService, ProcessedImage } from '../services/image-processor.service.js';

// Add mock for ImageProcessorService
const mockImageProcessor = {
  processAvatar: jest.fn(),
};

// Update test module to include ImageProcessorService mock
// In beforeEach:
providers: [
  UploadService,
  { provide: S3Service, useValue: mockS3Service },
  { provide: UsersService, useValue: mockUsersService },
  { provide: ImageProcessorService, useValue: mockImageProcessor },
],

// Add new test cases:
describe('uploadAvatar with image processing', () => {
  const mockVariants: ProcessedImage[] = [
    { size: 'small', format: 'webp', buffer: Buffer.from('sw'), width: 32, height: 32 },
    { size: 'small', format: 'jpg', buffer: Buffer.from('sj'), width: 32, height: 32 },
    { size: 'medium', format: 'webp', buffer: Buffer.from('mw'), width: 128, height: 128 },
    { size: 'medium', format: 'jpg', buffer: Buffer.from('mj'), width: 128, height: 128 },
    { size: 'large', format: 'webp', buffer: Buffer.from('lw'), width: 512, height: 512 },
    { size: 'large', format: 'jpg', buffer: Buffer.from('lj'), width: 512, height: 512 },
  ];

  const mockAvatarUrls = {
    small: { webp: 'https://s3/small.webp', jpg: 'https://s3/small.jpg' },
    medium: { webp: 'https://s3/medium.webp', jpg: 'https://s3/medium.jpg' },
    large: { webp: 'https://s3/large.webp', jpg: 'https://s3/large.jpg' },
  };

  beforeEach(() => {
    mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
    mockS3Service.uploadAvatarVariants.mockResolvedValue(mockAvatarUrls);
    mockUsersService.findById.mockResolvedValue({ id: 'user-123', avatarHash: null });
    mockUsersService.updateAvatarUrls.mockResolvedValue({});
  });

  it('should process image and upload all variants', async () => {
    const file = Buffer.from('test image data');

    const result = await service.uploadAvatar('user-123', file, 'image/jpeg');

    expect(mockImageProcessor.processAvatar).toHaveBeenCalledWith(file);
    expect(mockS3Service.uploadAvatarVariants).toHaveBeenCalled();
    expect(result.avatarUrls).toEqual(mockAvatarUrls);
  });

  it('should reject unsupported MIME types', async () => {
    const file = Buffer.from('test');

    await expect(service.uploadAvatar('user-123', file, 'image/heic')).rejects.toThrow(
      'Unsupported image format',
    );
  });

  it('should delete old avatar folder when replacing', async () => {
    mockUsersService.findById.mockResolvedValue({ id: 'user-123', avatarHash: 'oldhash' });
    mockS3Service.deleteAvatarFolder.mockResolvedValue(undefined);

    await service.uploadAvatar('user-123', Buffer.from('new image'), 'image/jpeg');

    // deleteAvatarFolder is called asynchronously, use setImmediate to wait
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockS3Service.deleteAvatarFolder).toHaveBeenCalledWith('user-123', 'oldhash');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="upload.service.spec" --no-coverage`
Expected: FAIL - new methods don't exist

- [ ] **Step 3: Update UploadService implementation**

Replace `services/user-service/src/upload/upload.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Service, type AvatarUrls } from '../services/s3.service.js';
import { UsersService } from '../users/users.service.js';
import { ImageProcessorService } from '../services/image-processor.service.js';
import * as crypto from 'crypto';

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export interface AvatarUploadResult {
  avatarUrls: AvatarUrls;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly usersService: UsersService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  /**
   * Upload and process an avatar image
   *
   * @param userId - User ID
   * @param file - Raw image buffer
   * @param mimeType - MIME type of the uploaded file
   * @returns Structured URLs for all avatar variants
   */
  async uploadAvatar(userId: string, file: Buffer, mimeType: string): Promise<AvatarUploadResult> {
    this.logger.log(`Uploading avatar for user ${userId}`);

    // 1. Validate MIME type
    this.validateMimeType(mimeType);

    try {
      // 2. Get old hash for cleanup
      const user = await this.usersService.findById(userId);
      const oldHash = (user as { avatarHash?: string }).avatarHash;

      // 3. Generate new hash from file content
      const newHash = crypto.createHash('sha256').update(file).digest('hex').substring(0, 8);

      // 4. Process image → 6 variants
      const variants = await this.imageProcessor.processAvatar(file);

      // 5. Upload all variants to S3
      const avatarUrls = await this.s3Service.uploadAvatarVariants(userId, newHash, variants);

      // 6. Update database
      await this.usersService.updateAvatarUrls(userId, avatarUrls, newHash);

      // 7. Delete old avatar folder asynchronously (non-blocking)
      if (oldHash && oldHash !== newHash) {
        this.s3Service.deleteAvatarFolder(userId, oldHash).catch((err) => {
          this.logger.warn(`Failed to delete old avatar folder: ${err.message}`);
        });
      }

      this.logger.log(`Avatar uploaded and processed successfully for user ${userId}`);

      return { avatarUrls };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to upload avatar for user ${userId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Validate that the MIME type is supported
   */
  private validateMimeType(mimeType: string): void {
    if (!SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new BadRequestException('Unsupported image format');
    }
  }

  async deleteAvatar(userId: string): Promise<void> {
    this.logger.log(`Deleting avatar for user: ${userId}`);

    try {
      // Get the current avatar hash
      const user = await this.usersService.findById(userId);
      const avatarHash = (user as { avatarHash?: string }).avatarHash;

      if (avatarHash) {
        // Delete folder from S3
        await this.s3Service.deleteAvatarFolder(userId, avatarHash);
        this.logger.log(`Avatar folder deleted from S3: ${userId}/${avatarHash}`);
      }

      // Remove avatar from user record
      await this.usersService.removeAvatar(userId);

      this.logger.log(`Avatar deleted successfully for user: ${userId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete avatar for user ${userId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test -- --testPathPattern="upload.service.spec" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/upload/upload.service.ts services/user-service/src/upload/upload.service.spec.ts
git commit -m "feat(user-service): integrate image processing into avatar upload flow

- Validate MIME types (JPEG, PNG, WebP, GIF supported)
- Generate content hash for S3 folder naming
- Process images into 6 variants via ImageProcessorService
- Upload variants and update database
- Async cleanup of old avatar folder"
```

---

## Task 8: Update UploadModule

**Files:**
- Modify: `services/user-service/src/upload/upload.module.ts`

- [ ] **Step 1: Add ImageProcessorService to module**

Update `services/user-service/src/upload/upload.module.ts` to include `ImageProcessorService`:

```typescript
import { ImageProcessorService } from '../services/image-processor.service.js';

@Module({
  providers: [UploadService, S3Service, ImageProcessorService],
  exports: [UploadService],
})
export class UploadModule {}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add services/user-service/src/upload/upload.module.ts
git commit -m "chore(user-service): register ImageProcessorService in UploadModule"
```

---

## Task 9: Update Frontend Types

**Files:**
- Modify: `frontend/src/types/user.ts`

- [ ] **Step 1: Add AvatarUrls interface**

Add to `frontend/src/types/user.ts`:

```typescript
/**
 * URLs for a single avatar size (WebP with JPEG fallback)
 */
export interface AvatarSizeUrls {
  webp: string;
  jpg: string;
}

/**
 * Structured avatar URLs for all sizes
 */
export interface AvatarUrls {
  small: AvatarSizeUrls;
  medium: AvatarSizeUrls;
  large: AvatarSizeUrls;
}
```

- [ ] **Step 2: Update User interface**

Update the `User` interface in `frontend/src/types/user.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;      // Deprecated, for migration
  avatarUrls?: AvatarUrls | null; // New structured avatar URLs
  bio?: string | null;
  // ... rest of fields
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/user.ts
git commit -m "feat(frontend): add AvatarUrls type for resized avatar support"
```

---

## Task 10: Update Avatar Component

**Files:**
- Modify: `frontend/src/components/ui/Avatar.tsx`

- [ ] **Step 1: Update Avatar component with picture element support**

Replace `frontend/src/components/ui/Avatar.tsx`:

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { User as UserIcon } from 'lucide-react';
import type { AvatarUrls } from '../../types/user';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarSizeKey = 'small' | 'medium' | 'large';

export interface AvatarProps {
  /**
   * URL of the avatar image (legacy single URL)
   */
  src?: string | null;

  /**
   * Structured avatar URLs for all sizes (new system)
   */
  avatarUrls?: AvatarUrls | null;

  /**
   * Alt text for the avatar image
   */
  alt?: string;

  /**
   * Size of the avatar
   */
  size?: AvatarSize;

  /**
   * Custom CSS class
   */
  className?: string;
}

/**
 * Avatar component for displaying user profile images
 *
 * Features:
 * - Multiple size variants
 * - WebP with JPEG fallback via <picture> element
 * - Backwards compatible with legacy single URL
 * - Fallback to user icon when no image
 * - Dark mode support
 * - Accessible alt text
 */
export function Avatar({
  src,
  avatarUrls,
  alt = 'User avatar',
  size = 'md',
  className = '',
}: AvatarProps) {
  const sizeClasses: Record<AvatarSize, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const iconSizeClasses: Record<AvatarSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  // Map component sizes to avatar URL size keys
  const sizeMap: Record<AvatarSize, AvatarSizeKey> = {
    xs: 'small',
    sm: 'small',
    md: 'medium',
    lg: 'large',
    xl: 'large',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-full overflow-hidden
    bg-gray-100 dark:bg-gray-700
    ${sizeClasses[size]}
    ${className}
  `;

  // Check for new structured avatar URLs first
  const sizeKey = sizeMap[size];
  const urls = avatarUrls?.[sizeKey];

  if (urls?.webp && urls?.jpg) {
    return (
      <picture className={baseClasses}>
        <source srcSet={urls.webp} type="image/webp" />
        <img src={urls.jpg} alt={alt} className="w-full h-full object-cover" />
      </picture>
    );
  }

  // Fall back to legacy single URL
  if (src) {
    return (
      <div className={baseClasses}>
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  // No image - show placeholder icon
  return (
    <div className={baseClasses}>
      <UserIcon
        className={`${iconSizeClasses[size]} text-gray-400 dark:text-gray-500`}
        aria-hidden="true"
      />
    </div>
  );
}

export default Avatar;
```

- [ ] **Step 2: Run frontend type check**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/frontend && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Avatar.tsx
git commit -m "feat(frontend): update Avatar component with picture element for WebP/JPEG fallback

- Support new avatarUrls prop with structured URLs
- Use <picture> element for optimal format selection
- Map component sizes to avatar size keys
- Maintain backwards compatibility with legacy src prop"
```

---

## Task 11: Update Components Using Avatar

**Files:**
- Modify: `frontend/src/components/layouts/Header.tsx`
- Modify: `frontend/src/components/layouts/Sidebar.tsx`
- Modify: `frontend/src/components/layouts/MobileDrawer.tsx`
- Modify: `frontend/src/components/navigation/CompactSiteNav.tsx`
- Modify: `frontend/src/components/responses/MentionDropdown.tsx`
- Modify: `frontend/src/components/profile/ProfileHeader.tsx`
- Modify: `frontend/src/pages/Profile/ProfilePage.tsx`

For each component that uses `<img src={user.avatarUrl}>`, update to use the Avatar component with both props:

- [ ] **Step 1: Update Header.tsx**

Find avatar image usage and replace with:
```tsx
import { Avatar } from '../ui/Avatar';

// Replace <img src={user.avatarUrl} ... /> with:
<Avatar
  src={user.avatarUrl}
  avatarUrls={user.avatarUrls}
  alt={user.displayName}
  size="sm"
/>
```

- [ ] **Step 2: Update Sidebar.tsx**

Same pattern - import Avatar and replace direct `<img>` with `<Avatar>` component.

- [ ] **Step 3: Update MobileDrawer.tsx**

Same pattern.

- [ ] **Step 4: Update CompactSiteNav.tsx**

Same pattern.

- [ ] **Step 5: Update MentionDropdown.tsx**

Same pattern with size="xs".

- [ ] **Step 6: Update ProfileHeader.tsx**

Same pattern with size="xl" for the main profile avatar.

- [ ] **Step 7: Update ProfilePage.tsx**

Same pattern.

- [ ] **Step 8: Run frontend type check**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/frontend && pnpm typecheck`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/layouts/ frontend/src/components/navigation/ frontend/src/components/responses/ frontend/src/components/profile/ frontend/src/pages/Profile/
git commit -m "refactor(frontend): update components to use Avatar with avatarUrls prop

- Header, Sidebar, MobileDrawer, CompactSiteNav
- MentionDropdown, ProfileHeader, ProfilePage
- All components now support WebP/JPEG fallback via Avatar"
```

---

## Task 12: Run Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run backend unit tests**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/services/user-service && pnpm test --no-coverage`
Expected: All tests PASS

- [ ] **Step 2: Run frontend type check**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/frontend && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Run full build**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git status
# If any fixes were made, commit them
```

---

## Summary

This plan implements avatar image resizing in 12 tasks:

1. **Task 1:** Add Sharp dependency
2. **Task 2:** Create test fixtures
3. **Task 3:** Create ImageProcessorService (TDD)
4. **Task 4:** Update Prisma schema
5. **Task 5:** Add S3Service methods (TDD) - with rollback on failure
6. **Task 6:** Add UsersService methods (TDD)
7. **Task 7:** Update UploadService (TDD)
8. **Task 8:** Update UploadModule
9. **Task 9:** Update frontend types
10. **Task 10:** Update Avatar component
11. **Task 11:** Update components using Avatar
12. **Task 12:** Run full test suite

Each task follows TDD where applicable and produces a self-contained commit.
