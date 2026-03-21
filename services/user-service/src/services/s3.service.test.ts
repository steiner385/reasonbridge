/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { S3Service } from './s3.service.js';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ProcessedImage } from './image-processor.service.js';

// Mock S3Client
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('S3Service', () => {
  let service: S3Service;
  let mockS3Client: { send: Mock };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment variables
    process.env['AWS_REGION'] = 'us-east-1';
    process.env['S3_AVATAR_BUCKET'] = 'test-bucket';
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-secret';

    // Create service instance
    service = new S3Service();

    // Get reference to mocked S3 client
    mockS3Client = (service as any).s3Client;
  });

  describe('uploadAvatarVariants', () => {
    it('should upload all 6 variants and return structured URLs', async () => {
      const variants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('test'), width: 32, height: 32 },
        { size: 'small', format: 'jpg', buffer: Buffer.from('test'), width: 32, height: 32 },
        { size: 'medium', format: 'webp', buffer: Buffer.from('test'), width: 128, height: 128 },
        { size: 'medium', format: 'jpg', buffer: Buffer.from('test'), width: 128, height: 128 },
        { size: 'large', format: 'webp', buffer: Buffer.from('test'), width: 512, height: 512 },
        { size: 'large', format: 'jpg', buffer: Buffer.from('test'), width: 512, height: 512 },
      ];

      mockS3Client.send.mockResolvedValue({});

      const result = await service.uploadAvatarVariants('user123', 'abc12345', variants);

      expect(result.small.webp).toContain('avatars/user123/abc12345/small.webp');
      expect(result.small.jpg).toContain('avatars/user123/abc12345/small.jpg');
      expect(result.medium.webp).toContain('avatars/user123/abc12345/medium.webp');
      expect(result.medium.jpg).toContain('avatars/user123/abc12345/medium.jpg');
      expect(result.large.webp).toContain('avatars/user123/abc12345/large.webp');
      expect(result.large.jpg).toContain('avatars/user123/abc12345/large.jpg');

      // Verify 6 uploads were made
      expect(mockS3Client.send).toHaveBeenCalledTimes(6);
    });

    it('should set correct content-type for each variant', async () => {
      const variants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('test'), width: 32, height: 32 },
        { size: 'small', format: 'jpg', buffer: Buffer.from('test'), width: 32, height: 32 },
      ];

      mockS3Client.send.mockResolvedValue({});

      await service.uploadAvatarVariants('user123', 'abc12345', variants);

      // Check the PutObjectCommand constructor calls
      const calls = (PutObjectCommand as unknown as Mock).mock.calls;
      expect(calls.length).toBe(2);

      // First call should be webp
      expect(calls[0][0]).toMatchObject({
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      });

      // Second call should be jpg
      expect(calls[1][0]).toMatchObject({
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      });
    });

    it('should rollback uploaded files if any upload fails', async () => {
      const variants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('test'), width: 32, height: 32 },
        { size: 'small', format: 'jpg', buffer: Buffer.from('test'), width: 32, height: 32 },
        { size: 'medium', format: 'webp', buffer: Buffer.from('test'), width: 128, height: 128 },
        { size: 'medium', format: 'jpg', buffer: Buffer.from('test'), width: 128, height: 128 },
      ];

      // Mock to succeed for first 3, fail on 4th
      mockS3Client.send
        .mockResolvedValueOnce({}) // small.webp succeeds
        .mockResolvedValueOnce({}) // small.jpg succeeds
        .mockResolvedValueOnce({}) // medium.webp succeeds
        .mockRejectedValueOnce(new Error('Upload failed')); // medium.jpg fails

      await expect(service.uploadAvatarVariants('user123', 'abc12345', variants)).rejects.toThrow(
        'Upload failed',
      );

      // Verify DeleteObjectCommand was called 3 times for rollback
      const deleteCalls = (DeleteObjectCommand as unknown as Mock).mock.calls;
      expect(deleteCalls.length).toBe(3);
      expect(deleteCalls[0][0].Key).toBe('avatars/user123/abc12345/small.webp');
      expect(deleteCalls[1][0].Key).toBe('avatars/user123/abc12345/small.jpg');
      expect(deleteCalls[2][0].Key).toBe('avatars/user123/abc12345/medium.webp');
    });
  });

  describe('deleteAvatarFolder', () => {
    it('should delete all files in the avatar folder', async () => {
      // Mock list response with 6 files
      mockS3Client.send.mockResolvedValueOnce({
        Contents: [
          { Key: 'avatars/user123/abc12345/small.webp' },
          { Key: 'avatars/user123/abc12345/small.jpg' },
          { Key: 'avatars/user123/abc12345/medium.webp' },
          { Key: 'avatars/user123/abc12345/medium.jpg' },
          { Key: 'avatars/user123/abc12345/large.webp' },
          { Key: 'avatars/user123/abc12345/large.jpg' },
        ],
      });

      // Mock delete responses
      mockS3Client.send.mockResolvedValue({});

      await service.deleteAvatarFolder('user123', 'abc12345');

      // Verify ListObjectsV2Command was called
      const listCalls = (ListObjectsV2Command as unknown as Mock).mock.calls;
      expect(listCalls.length).toBe(1);
      expect(listCalls[0][0]).toMatchObject({
        Bucket: 'test-bucket',
        Prefix: 'avatars/user123/abc12345/',
      });

      // Verify DeleteObjectCommand was called 6 times
      const deleteCalls = (DeleteObjectCommand as unknown as Mock).mock.calls;
      expect(deleteCalls.length).toBe(6);
      expect(deleteCalls[0][0].Key).toBe('avatars/user123/abc12345/small.webp');
      expect(deleteCalls[5][0].Key).toBe('avatars/user123/abc12345/large.jpg');
    });

    it('should not throw if folder does not exist', async () => {
      // Mock empty list response
      mockS3Client.send.mockResolvedValueOnce({
        Contents: [],
      });

      await expect(service.deleteAvatarFolder('user123', 'nonexistent')).resolves.not.toThrow();

      // Should have called list but not delete
      expect((ListObjectsV2Command as unknown as Mock).mock.calls.length).toBe(1);
      expect((DeleteObjectCommand as unknown as Mock).mock.calls.length).toBe(0);
    });

    it('should handle undefined Contents array', async () => {
      // Mock response with no Contents property
      mockS3Client.send.mockResolvedValueOnce({});

      await expect(service.deleteAvatarFolder('user123', 'nonexistent')).resolves.not.toThrow();

      // Should have called list but not delete
      expect((ListObjectsV2Command as unknown as Mock).mock.calls.length).toBe(1);
      expect((DeleteObjectCommand as unknown as Mock).mock.calls.length).toBe(0);
    });
  });
});
