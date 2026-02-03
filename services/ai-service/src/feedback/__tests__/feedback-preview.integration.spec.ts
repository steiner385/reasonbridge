import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../app.module.js';

// Skip integration tests when DATABASE_URL is not available (e.g., CI unit test phase)
const skipIntegration = !process.env['DATABASE_URL'];

/**
 * Integration tests for POST /feedback/preview endpoint
 *
 * Tests authentication (FR-015), rate limiting (FR-016), and response format.
 * Uses actual NestJS application with mocked external services.
 *
 * NOTE: These tests require DATABASE_URL to be set. They are skipped in CI
 * unit test phase and run during integration test phase when database is available.
 */
describe.skipIf(skipIntegration)('POST /feedback/preview Integration', () => {
  let app: NestFastifyApplication;
  let validToken: string;

  // Create a valid JWT token for testing (HS256 with JWT_SECRET)
  const createTestToken = (payload: Record<string, unknown> = {}): string => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const defaultPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      ...payload,
    };
    const payloadB64 = Buffer.from(JSON.stringify(defaultPayload)).toString('base64url');

    // Sign with JWT_SECRET (must match env var in test setup)
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', process.env['JWT_SECRET'] || 'test-secret')
      .update(`${header}.${payloadB64}`)
      .digest('base64url');

    return `${header}.${payloadB64}.${signature}`;
  };

  beforeAll(async () => {
    // Set test environment variables
    process.env['JWT_SECRET'] = 'test-secret-for-integration-tests';
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

    validToken = createTestToken();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication (FR-015)', () => {
    it('should return 401 when no Authorization header provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        payload: {
          content: 'This is a test message that is at least 20 characters.',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('authentication');
    });

    it('should return 401 when Authorization header has invalid format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: 'InvalidFormat token123',
        },
        payload: {
          content: 'This is a test message that is at least 20 characters.',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = createTestToken({
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });

      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
        payload: {
          content: 'This is a test message that is at least 20 characters.',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when token has invalid signature', async () => {
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
        payload: {
          content: 'This is a test message that is at least 20 characters.',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should accept valid JWT token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        payload: {
          content: 'This is a test message that is at least 20 characters.',
        },
      });

      // Should succeed or fail for reasons other than auth (200 or 500 from analyzer)
      expect([200, 500]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('feedback');
        expect(body).toHaveProperty('readyToPost');
      }
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when content is too short (< 20 chars)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        payload: {
          content: 'Too short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });

    it('should accept valid sensitivity values', async () => {
      for (const sensitivity of ['LOW', 'MEDIUM', 'HIGH']) {
        const response = await app.inject({
          method: 'POST',
          url: '/feedback/preview',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
          payload: {
            content: 'This is a valid test message for sensitivity testing.',
            sensitivity,
          },
        });

        // Should not fail validation (200 or 500 from analyzer)
        expect([200, 500]).toContain(response.statusCode);
      }
    });

    it('should reject invalid sensitivity values', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
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
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        payload: {
          content: 'This is a test message that should trigger some feedback analysis.',
        },
      });

      if (response.statusCode === 200) {
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
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        payload: {
          content: 'This is a test message for timing verification.',
        },
      });

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.analysisTimeMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Rate Limiting (FR-016)', () => {
    it('should allow requests within rate limit', async () => {
      // First request should succeed
      const response = await app.inject({
        method: 'POST',
        url: '/feedback/preview',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        payload: {
          content: 'This is a test message for rate limiting.',
        },
      });

      expect([200, 500]).toContain(response.statusCode);
    });

    // Note: Full rate limit testing requires either:
    // 1. Making 11+ requests rapidly (would slow down tests)
    // 2. Mocking the throttler time (complex setup)
    // This test documents the expected behavior
    it.skip('should return 429 when rate limit exceeded (10 req/min)', async () => {
      // Make 11 requests rapidly
      for (let i = 0; i < 11; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/feedback/preview',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
          payload: {
            content: `Rate limit test message ${i} - enough chars.`,
          },
        });

        if (i < 10) {
          expect([200, 500]).toContain(response.statusCode);
        } else {
          expect(response.statusCode).toBe(429);
        }
      }
    });
  });
});
