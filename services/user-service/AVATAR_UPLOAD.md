# Avatar Upload Feature

## Overview

This feature implements S3-based avatar upload functionality for the user service. Users can upload avatar images which are stored in AWS S3 with proper namespacing and caching.

## Components

### S3Service (`src/services/s3.service.ts`)

Core service for S3 operations:
- Upload avatars to S3
- Delete avatars from S3
- Generate signed URLs for private access
- Automatic file hashing to prevent duplicates
- Proper error handling and logging

### UploadService (`src/upload/upload.service.ts`)

Business logic layer for upload operations:
- Validates upload requests
- Delegates to S3Service
- Handles errors and logging

### UploadController (`src/upload/upload.controller.ts`)

REST API endpoints:
- `POST /upload/avatar/:userId` - Upload avatar
- `DELETE /upload/avatar/:key` - Delete avatar

## Configuration

Required environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_AVATAR_BUCKET=unite-discord-avatars
```

## API Usage

### Upload Avatar

```bash
POST /upload/avatar/:userId
Content-Type: application/json

{
  "file": "base64-encoded-image-data",
  "mimetype": "image/jpeg"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "key": "avatars/user-123/abc123.jpg",
    "url": "https://unite-discord-avatars.s3.us-east-1.amazonaws.com/avatars/user-123/abc123.jpg",
    "bucket": "unite-discord-avatars"
  }
}
```

### Delete Avatar

```bash
DELETE /upload/avatar/avatars/user-123/abc123.jpg
```

Response: 204 No Content

## Features

- ✅ File type validation (JPEG, PNG, GIF, WebP)
- ✅ File size validation (5MB max)
- ✅ MD5 hashing to prevent duplicate uploads
- ✅ Per-user namespacing (`avatars/:userId/:hash.ext`)
- ✅ CloudFront-compatible caching headers
- ✅ Comprehensive error handling
- ✅ Logging for debugging and monitoring

## S3 Bucket Structure

```
unite-discord-avatars/
└── avatars/
    └── {userId}/
        └── {hash}.{ext}
```

Example: `avatars/user-123/d41d8cd98f00b204e9800998ecf8427e.jpg`

## Security

- File type whitelist prevents malicious uploads
- File size limit prevents resource exhaustion
- Per-user namespacing prevents collisions
- S3 bucket should be configured with appropriate IAM policies

## Future Enhancements

- [ ] Image resizing/optimization before upload
- [ ] Multiple avatar sizes (thumbnail, medium, large)
- [ ] Direct browser upload using presigned URLs
- [ ] Integration with user profile updates
- [ ] Avatar history/versioning
