import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../app.module.js';

/**
 * Integration tests for POST /feedback/preview endpoint
 *
 * Tests request validation and response format for the regex-based preview
 * endpoint. Uses the actual NestJS application.
 *
 * NOTE: This service is intentionally guard-free. JWT authentication and rate
 * limiting are enforced upstream at the api-gateway, not per-service, so the
 * controller has no auth/throttler guards. Former "Authentication (FR-015)"
 * and "Rate Limiting (FR-016)" blocks were removed because they asserted
 * behavior that no longer lives in this service.
 *
 * These tests require DATABASE_URL to be set. They are skipped in the CI unit
 * test phase and run during the integration test phase when the database is
 * available.
 */
describe.skipIf(!process.env['DATABASE_URL'])('POST /feedback/preview Integration', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // NOTE: The former "Authentication (FR-015)" describe block was removed.
  // The ai-service is intentionally guard-free: JWT authentication is enforced
  // upstream at the api-gateway, not per-service. The controller has no auth
  // guards, so unauthenticated requests to /feedback/preview return 200. Those
  // 401 assertions tested functionality that no longer lives in this service.

  describe('Preview Feedback (regex-based, no auth required)', () => {
    it('should return 200 and expected shape for valid content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {
          content: 'This is a test message that is at least 20 characters.',
        },
      });

      // preview is fully regex-based (no Bedrock dependency), so it is
      // deterministic and always succeeds for valid input.
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('feedback');
      expect(body).toHaveProperty('readyToPost');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when content is too short (< 20 chars)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {
          content: 'Too short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });

    it('should accept valid sensitivity values', async () => {
      // FeedbackSensitivity enum values are lowercase ('low' | 'medium' | 'high').
      for (const sensitivity of ['low', 'medium', 'high']) {
        const response = await app.inject({
          method: 'POST',
          url: '/feedback/preview',
          payload: {
            content: 'This is a valid test message for sensitivity testing.',
            sensitivity,
          },
        });

        // preview is regex-based and deterministic, so valid input returns 200.
        expect(response.statusCode).toBe(200);
      }
    });

    it('should reject invalid sensitivity values', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {
          content: 'This is a valid test message for sensitivity testing.',
          sensitivity: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Response Format', () => {
    it('should return expected response structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {
          content: 'This is a test message that should trigger some feedback analysis.',
        },
      });

      // preview is regex-based and deterministic, so it always returns 200.
      expect(response.statusCode).toBe(200);
      {
        const body = JSON.parse(response.body);

        // Required fields
        expect(body).toHaveProperty('feedback');
        expect(Array.isArray(body.feedback)).toBe(true);
        expect(body).toHaveProperty('readyToPost');
        expect(typeof body.readyToPost).toBe('boolean');
        expect(body).toHaveProperty('summary');
        expect(typeof body.summary).toBe('string');
        expect(body).toHaveProperty('analysisTimeMs');
        expect(typeof body.analysisTimeMs).toBe('number');

        // Feedback item structure (if any)
        if (body.feedback.length > 0) {
          const item = body.feedback[0];
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('suggestionText');
          expect(item).toHaveProperty('reasoning');
          expect(item).toHaveProperty('confidenceScore');
          expect(item).toHaveProperty('shouldDisplay');
        }
      }
    });

    it('should include analysisTimeMs in response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {
          content: 'This is a test message for timing verification.',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.analysisTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // NOTE: The former "Rate Limiting (FR-016)" describe block was removed.
  // The ai-service controller has no throttler guard on /feedback/preview;
  // rate limiting is enforced upstream at the api-gateway, not per-service.
  // The 429 assertions tested functionality that no longer lives in this
  // service, so they were deleted rather than weakened.
});
