# Avatar Image Resizing Design

**Date:** 2026-03-21
**Status:** Approved
**Author:** Claude Code

## Overview

Enhance avatar upload to automatically resize images into multiple optimized variants. This reduces bandwidth, improves load times, and provides appropriate image sizes for different UI contexts.

## Requirements

- Process uploaded images into 3 sizes: 32x32 (small), 128x128 (medium), 512x512 (large)
- Generate WebP and JPEG versions of each size (6 total variants)
- Process synchronously during upload using Sharp library
- Store URLs in structured JSON database field
- Discard original after processing
- Maintain backwards compatibility with existing avatars

## Architecture

```
Upload Flow:
┌──────────┐     ┌───────────────┐     ┌──────────────────┐     ┌─────┐
│ Frontend │────▶│ UploadService │────▶│ ImageProcessor   │────▶│ S3  │
│          │     │               │     │ (sharp)          │     │     │
└──────────┘     └───────────────┘     └──────────────────┘     └─────┘
                         │                      │
                         │                      ▼
                         │              ┌──────────────────┐
                         └─────────────▶│ Database         │
                                        │ (avatarUrls JSON)│
                                        └──────────────────┘
```

**New component:** `ImageProcessorService` handles all resizing logic, keeping `UploadService` focused on orchestration.

**Processing pipeline:**
1. Receive raw buffer
2. Validate image (sharp can read it, minimum 32x32)
3. Generate 6 variants (3 sizes × 2 formats)
4. Return array of buffers with metadata

## Database Schema

Replace single `avatarUrl` field with structured `avatarUrls` JSON:

```prisma
model User {
  // Deprecated (keep for migration):
  avatarUrl     String?  @map("avatar_url")
  avatarS3Key   String?  @map("avatar_s3_key")

  // New field:
  avatarUrls    Json?    @map("avatar_urls")
}
```

**AvatarUrls structure:**
```json
{
  "small":  { "webp": "https://...", "jpg": "https://..." },
  "medium": { "webp": "https://...", "jpg": "https://..." },
  "large":  { "webp": "https://...", "jpg": "https://..." }
}
```

**Migration strategy:**
- Add new `avatarUrls` field (nullable)
- Keep old `avatarUrl` field temporarily for backwards compatibility
- Frontend checks `avatarUrls` first, falls back to `avatarUrl`
- Existing avatars continue working without re-processing

## S3 Storage Structure

```
reason-bridge-avatars/
└── avatars/
    └── {userId}/
        └── {hash}/
            ├── small.webp    (32x32)
            ├── small.jpg     (32x32)
            ├── medium.webp   (128x128)
            ├── medium.jpg    (128x128)
            ├── large.webp    (512x512)
            └── large.jpg     (512x512)
```

**Changes from current structure:**
- Add hash subdirectory to group variants together
- Use descriptive names (`small.webp`) instead of hash-based names
- Makes cleanup easier — delete one folder to remove all variants

**Deletion:** When user uploads new avatar or removes avatar, delete entire `{userId}/{hash}/` folder.

## Service Layer

### ImageProcessorService (New)

```typescript
interface ProcessedImage {
  size: 'small' | 'medium' | 'large';
  format: 'webp' | 'jpg';
  buffer: Buffer;
  width: number;
  height: number;
}

@Injectable()
class ImageProcessorService {
  private readonly sizes = {
    small: 32,
    medium: 128,
    large: 512,
  };

  async processAvatar(input: Buffer): Promise<ProcessedImage[]>;
  // Returns 6 variants, throws if invalid image
}
```

### S3Service (Modified)

```typescript
// New method for batch upload
async uploadAvatarVariants(
  userId: string,
  variants: ProcessedImage[]
): Promise<AvatarUrls>

// New method for folder deletion
async deleteAvatarFolder(userId: string, hash: string): Promise<void>
```

### UploadService (Modified)

```typescript
async uploadAvatar(userId: string, file: Buffer, mimeType: string) {
  // 1. Process image → 6 variants
  const variants = await this.imageProcessor.processAvatar(file);

  // 2. Upload all variants to S3
  const avatarUrls = await this.s3Service.uploadAvatarVariants(userId, variants);

  // 3. Update user.avatarUrls in database
  await this.usersService.updateAvatarUrls(userId, avatarUrls);

  // 4. Delete old avatar folder if exists
  // (handled internally)
}
```

## Frontend Changes

### TypeScript Types

```typescript
interface AvatarUrls {
  small:  { webp: string; jpg: string };
  medium: { webp: string; jpg: string };
  large:  { webp: string; jpg: string };
}

interface User {
  avatarUrl?: string;      // Deprecated, for migration
  avatarUrls?: AvatarUrls; // New
}
```

### Avatar Component Enhancement

Update `Avatar.tsx` to use `<picture>` element for optimal format selection:

```tsx
interface AvatarProps {
  user: User;
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

function Avatar({ user, size, className }: AvatarProps) {
  const sizeMap = { sm: 'small', md: 'medium', lg: 'large' };
  const sizeKey = sizeMap[size];

  // Fallback logic: avatarUrls → avatarUrl → Gravatar
  if (user.avatarUrls?.[sizeKey]) {
    return (
      <picture>
        <source srcSet={user.avatarUrls[sizeKey].webp} type="image/webp" />
        <img src={user.avatarUrls[sizeKey].jpg} alt={user.displayName} />
      </picture>
    );
  }

  // Legacy fallback
  return <img src={user.avatarUrl || getGravatarUrl(user.email)} alt={...} />;
}
```

### Component Updates

Replace direct `<img src={user.avatarUrl}>` usages with `<Avatar>` component in:
- `Header.tsx`
- `Sidebar.tsx`
- `MobileDrawer.tsx`
- `CompactSiteNav.tsx`
- `MentionDropdown.tsx`
- `ProfileHeader.tsx`
- `ProfilePage.tsx`

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid image (corrupted, not an image) | Sharp throws → return 400 "Invalid image file" |
| Image too small (< 32x32) | Reject upload → return 400 "Image must be at least 32x32 pixels" |
| Sharp processing fails | Log error, return 500 "Failed to process image" |
| S3 upload fails mid-batch | Delete any uploaded variants, return 500 |
| Partial S3 deletion fails | Log warning, continue (orphaned files cleaned later) |

## Testing

### Unit Tests

**`image-processor.service.spec.ts`:**
- Valid JPEG → produces 6 variants with correct dimensions
- Valid PNG with transparency → WebP preserves alpha, JPG gets white background
- Corrupt file → throws descriptive error
- Image < 32x32 → throws minimum size error
- Verify output formats and sizes match spec

**`upload.service.spec.ts`:**
- Integration with ImageProcessorService mock
- Database receives correct `avatarUrls` structure
- Old avatar folder deleted on re-upload

### Integration Tests

- Full upload flow with LocalStack S3
- Verify all 6 files exist in S3 with correct keys
- Verify URLs are accessible and return correct content types

### Test Fixtures

Small valid JPEG/PNG files in `services/user-service/test/fixtures/`:
- `valid-avatar.jpg` (100x100)
- `valid-avatar.png` (100x100, with transparency)
- `tiny-avatar.jpg` (16x16, for rejection test)
- `corrupt.jpg` (invalid data)

## Files to Create/Modify

| File | Action |
|------|--------|
| `services/user-service/src/services/image-processor.service.ts` | Create |
| `services/user-service/src/services/image-processor.service.spec.ts` | Create |
| `services/user-service/src/services/s3.service.ts` | Modify |
| `services/user-service/src/services/s3.service.spec.ts` | Modify |
| `services/user-service/src/upload/upload.service.ts` | Modify |
| `services/user-service/src/upload/upload.service.spec.ts` | Modify |
| `services/user-service/src/users/users.service.ts` | Modify |
| `services/user-service/package.json` | Add sharp dependency |
| `packages/db-models/prisma/schema.prisma` | Add avatarUrls field |
| `packages/db-models/prisma/migrations/...` | New migration |
| `frontend/src/components/ui/Avatar.tsx` | Modify |
| `frontend/src/types/user.ts` | Add AvatarUrls type |

## Dependencies

**New:**
- `sharp` (^0.33.x) — High-performance image processing

**Existing (no changes):**
- `@aws-sdk/client-s3` — S3 operations
- LocalStack — Local development
