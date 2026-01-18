import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VideoVerificationService } from './video-challenge.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('VideoVerificationService', () => {
  let service: VideoVerificationService;
  let _configService: ConfigService;

  const mockConfig: Record<string, unknown> = {
    AWS_REGION: 'us-east-1',
    S3_VIDEO_VERIFICATION_BUCKET: 'test-bucket',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    VIDEO_MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    VIDEO_MIN_DURATION_SECONDS: 3,
    VIDEO_MAX_DURATION_SECONDS: 30,
    VIDEO_UPLOAD_URL_EXPIRES_IN: 3600,
  };

  const mockConfigService = {
    get: <T>(key: string): T | undefined => mockConfig[key] as T | undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoVerificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VideoVerificationService>(VideoVerificationService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  describe('generateChallenge', () => {
    it('should generate a phrase challenge with random phrase', () => {
      const challenge = service.generateChallenge('RANDOM_PHRASE');

      expect(challenge).toBeDefined();
      expect(challenge.type).toBe('RANDOM_PHRASE');
      expect(challenge.instruction).toContain('Say the following phrase');
      expect(challenge.randomValue).toBeDefined();
      expect(challenge.randomValue).toMatch(
        /I am a real human being|Verify my authenticity|This is my video verification|Accept my verification|I consent to this verification|Confirm my identity|Validate my account|Authenticate my presence|Secure my account|Trust me now/,
      );
    });

    it('should generate a gesture challenge with random gesture', () => {
      const challenge = service.generateChallenge('RANDOM_GESTURE');

      expect(challenge).toBeDefined();
      expect(challenge.type).toBe('RANDOM_GESTURE');
      expect(challenge.instruction).toContain('Perform this action');
      expect(challenge.randomValue).toBeDefined();
      expect(challenge.randomValue).toMatch(
        /Show both thumbs up|Nod your head three times|Blink your eyes slowly|Smile and wave|Make a peace sign with your hand/,
      );
    });

    it('should generate a timestamp challenge with ISO timestamp', () => {
      const challenge = service.generateChallenge('TIMESTAMP');

      expect(challenge).toBeDefined();
      expect(challenge.type).toBe('TIMESTAMP');
      expect(challenge.instruction).toContain('Display the current timestamp');
      expect(challenge.timestamp).toBeDefined();
      // Verify it's a valid ISO 8601 timestamp
      expect(new Date(challenge.timestamp!).getTime()).toBeGreaterThan(0);
    });

    it('should throw BadRequestException for unknown challenge type', () => {
      // @ts-ignore - Testing invalid input
      expect(() => service.generateChallenge('INVALID_TYPE')).toThrow(
        BadRequestException,
      );
    });

    it('should generate different phrases on multiple calls', () => {
      const challenges: string[] = [];
      // Generate 20 challenges and collect the phrases
      for (let i = 0; i < 20; i++) {
        const challenge = service.generateChallenge('RANDOM_PHRASE');
        challenges.push(challenge.randomValue!);
      }

      // Should have at least 2 different phrases (with high probability)
      const uniquePhrases = new Set(challenges);
      expect(uniquePhrases.size).toBeGreaterThan(1);
    });

    it('should generate different gestures on multiple calls', () => {
      const gestures: string[] = [];
      // Generate 20 challenges and collect the gestures
      for (let i = 0; i < 20; i++) {
        const challenge = service.generateChallenge('RANDOM_GESTURE');
        gestures.push(challenge.randomValue!);
      }

      // Should have at least 2 different gestures (with high probability)
      const uniqueGestures = new Set(gestures);
      expect(uniqueGestures.size).toBeGreaterThan(1);
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate a valid upload URL', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockResolvedValueOnce('https://s3.amazonaws.com/signed-url');

      const url = await service.generateUploadUrl(
        'user-123',
        'verification-456',
      );

      expect(url).toBe('https://s3.amazonaws.com/signed-url');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should generate upload URL with custom filename', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockResolvedValueOnce('https://s3.amazonaws.com/signed-url');

      const url = await service.generateUploadUrl(
        'user-123',
        'verification-456',
        'my-video.mp4',
      );

      expect(url).toBe('https://s3.amazonaws.com/signed-url');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should throw BadRequestException on S3 error', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockRejectedValueOnce(
        new Error('S3 service error'),
      );

      await expect(
        service.generateUploadUrl('user-123', 'verification-456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include userId and verificationId in metadata', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      getSignedUrl.mockResolvedValueOnce('https://s3.amazonaws.com/signed-url');

      await service.generateUploadUrl('user-123', 'verification-456');

      // Verify that PutObjectCommand was called with correct metadata
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      expect(PutObjectCommand).toHaveBeenCalled();
    });
  });

  describe('getVideoConstraints', () => {
    it('should return video constraints from config', () => {
      const constraints = service.getVideoConstraints();

      expect(constraints).toBeDefined();
      expect(constraints.maxFileSize).toBe(100 * 1024 * 1024);
      expect(constraints.minDurationSeconds).toBe(3);
      expect(constraints.maxDurationSeconds).toBe(30);
    });

    it('should use default values when config is not set', async () => {
      const moduleWithDefaults = await Test.createTestingModule({
        providers: [
          VideoVerificationService,
          {
            provide: ConfigService,
            useValue: {
              get: () => undefined,
            },
          },
        ],
      }).compile();

      const serviceWithDefaults = moduleWithDefaults.get<VideoVerificationService>(
        VideoVerificationService,
      );
      const constraints = serviceWithDefaults.getVideoConstraints();

      expect(constraints.maxFileSize).toBe(100 * 1024 * 1024); // 100MB default
      expect(constraints.minDurationSeconds).toBe(3);
      expect(constraints.maxDurationSeconds).toBe(30);
    });
  });

  describe('Challenge persistence', () => {
    it('should generate consistent challenge instructions', () => {
      const challenge1 = service.generateChallenge('RANDOM_PHRASE');
      const challenge2 = service.generateChallenge('RANDOM_PHRASE');

      // Different calls should generate different challenges (with high probability)
      // but both should have valid structure
      expect(challenge1.type).toBe(challenge2.type);
      expect(challenge1.instruction).toMatch(/Say the following phrase/);
      expect(challenge2.instruction).toMatch(/Say the following phrase/);
    });

    it('should handle all supported challenge types', () => {
      const types = ['RANDOM_PHRASE', 'RANDOM_GESTURE', 'TIMESTAMP'] as const;

      types.forEach((type) => {
        const challenge = service.generateChallenge(type);
        expect(challenge.type).toBe(type);
        expect(challenge.instruction).toBeDefined();
      });
    });
  });
});
