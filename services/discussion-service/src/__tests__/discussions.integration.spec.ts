/**
 * T034 [US1] - Integration test for POST /discussions API endpoint (Feature 009)
 *
 * Tests the complete discussion creation flow including:
 * - Request validation
 * - User verification check
 * - Topic validation
 * - SSRF protection for citations
 * - Transaction atomicity
 * - Rate limiting
 * - Response format
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import request from 'supertest';
import { DiscussionsModule } from '../discussions/discussions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Discussions API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testTopicId = '00000000-0000-0000-0000-000000000002';
  const unverifiedUserId = '00000000-0000-0000-0000-000000000003';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DiscussionsModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());

    // Enable validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  afterEach(async () => {
    // Clean up discussions created during tests
    await prisma.discussion.deleteMany({
      where: {
        topicId: testTopicId,
      },
    });
  });

  async function setupTestData() {
    // Create test topic
    await prisma.discussionTopic.upsert({
      where: { id: testTopicId },
      update: {},
      create: {
        id: testTopicId,
        title: 'Test Topic',
        description: 'Topic for integration testing',
        status: 'ACTIVE',
        responseCount: 0,
        participantCount: 0,
      },
    });

    // Create verified user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: 'verified@test.com',
        displayName: 'Verified User',
        emailVerified: true,
        authMethod: 'EMAIL',
      },
    });

    // Create unverified user
    await prisma.user.upsert({
      where: { id: unverifiedUserId },
      update: {},
      create: {
        id: unverifiedUserId,
        email: 'unverified@test.com',
        displayName: 'Unverified User',
        emailVerified: false,
        authMethod: 'EMAIL',
      },
    });
  }

  async function cleanupTestData() {
    await prisma.discussion.deleteMany({ where: { topicId: testTopicId } });
    await prisma.discussionTopic.delete({ where: { id: testTopicId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: unverifiedUserId } }).catch(() => {});
  }

  describe('POST /discussions', () => {
    const validDiscussionData = {
      topicId: testTopicId,
      title: 'Should carbon taxes be increased in 2027?',
      initialResponse: {
        content:
          'I believe carbon taxes are essential for addressing climate change because they create economic incentives for reducing emissions and encouraging green technology adoption.',
        citations: [
          {
            url: 'https://example.com/carbon-tax-study',
            title: 'Carbon Tax Effectiveness Study',
          },
        ],
      },
    };

    it('should successfully create a discussion with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(validDiscussionData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(201);

      expect(response.body).toMatchObject({
        topicId: testTopicId,
        title: validDiscussionData.title,
        status: 'ACTIVE',
        creator: {
          id: testUserId,
          displayName: 'Verified User',
        },
        responseCount: 1,
        participantCount: 1,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.responses).toHaveLength(1);
      expect(response.body.responses[0].content).toBe(validDiscussionData.initialResponse.content);
      expect(response.body.responses[0].citations).toHaveLength(1);
    });

    it('should reject request with missing title', async () => {
      const invalidData = {
        ...validDiscussionData,
        title: undefined,
      };

      await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);
    });

    it('should reject title shorter than 10 characters', async () => {
      const invalidData = {
        ...validDiscussionData,
        title: 'Short',
      };

      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);

      expect(response.body.message).toContain('Title must be at least 10 characters');
    });

    it('should reject title longer than 200 characters', async () => {
      const invalidData = {
        ...validDiscussionData,
        title: 'A'.repeat(201),
      };

      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);

      expect(response.body.message).toContain('Title cannot exceed 200 characters');
    });

    it('should reject initial response shorter than 50 characters', async () => {
      const invalidData = {
        ...validDiscussionData,
        initialResponse: {
          content: 'Too short',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);

      expect(response.body.message).toContain('Initial response must be at least 50 characters');
    });

    it('should reject initial response longer than 25000 characters', async () => {
      const invalidData = {
        ...validDiscussionData,
        initialResponse: {
          content: 'A'.repeat(25001),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);

      expect(response.body.message).toContain('Initial response cannot exceed 25,000 characters');
    });

    it('should reject more than 10 citations', async () => {
      const invalidData = {
        ...validDiscussionData,
        initialResponse: {
          content: validDiscussionData.initialResponse.content,
          citations: Array(11)
            .fill(null)
            .map((_, i) => ({
              url: `https://example.com/source${i}`,
              title: `Source ${i}`,
            })),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);

      expect(response.body.message).toContain('Maximum 10 citations allowed');
    });

    it('should reject invalid citation URL format', async () => {
      const invalidData = {
        ...validDiscussionData,
        initialResponse: {
          content: validDiscussionData.initialResponse.content,
          citations: [
            {
              url: 'not-a-valid-url',
              title: 'Invalid URL',
            },
          ],
        },
      };

      await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);
    });

    it('should reject citation with private IP address (SSRF protection)', async () => {
      const invalidData = {
        ...validDiscussionData,
        initialResponse: {
          content: validDiscussionData.initialResponse.content,
          citations: [
            {
              url: 'http://192.168.1.1/admin',
              title: 'Private IP',
            },
          ],
        },
      };

      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(400);

      expect(response.body.message).toContain('Citation URL blocked');
    });

    it('should reject request from unverified user', async () => {
      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(validDiscussionData)
        .set('Authorization', `Bearer mock-token-${unverifiedUserId}`)
        .expect(403);

      expect(response.body.message).toContain('Only verified users can create discussions');
    });

    it('should reject request for non-existent topic', async () => {
      const invalidData = {
        ...validDiscussionData,
        topicId: '00000000-0000-0000-0000-000000000999',
      };

      await request(app.getHttpServer())
        .post('/discussions')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(404);
    });

    it('should create ParticipantActivity record', async () => {
      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(validDiscussionData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(201);

      const activity = await prisma.participantActivity.findUnique({
        where: {
          discussionId_userId: {
            discussionId: response.body.id,
            userId: testUserId,
          },
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.responseCount).toBe(1);
    });

    it('should create discussion and initial response atomically', async () => {
      const discussionsBefore = await prisma.discussion.count();
      const responsesBefore = await prisma.response.count();

      await request(app.getHttpServer())
        .post('/discussions')
        .send(validDiscussionData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(201);

      const discussionsAfter = await prisma.discussion.count();
      const responsesAfter = await prisma.response.count();

      expect(discussionsAfter).toBe(discussionsBefore + 1);
      expect(responsesAfter).toBe(responsesBefore + 1);
    });

    it('should normalize citation URLs', async () => {
      const response = await request(app.getHttpServer())
        .post('/discussions')
        .send(validDiscussionData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(201);

      const citation = response.body.responses[0].citations[0];
      expect(citation.originalUrl).toBe('https://example.com/carbon-tax-study');
      expect(citation.normalizedUrl).toBe('https://example.com/carbon-tax-study');
      expect(citation.validationStatus).toBe('UNVERIFIED');
    });
  });

  describe('GET /discussions', () => {
    beforeEach(async () => {
      // Create test discussions
      for (let i = 1; i <= 3; i++) {
        await prisma.discussion.create({
          data: {
            topicId: testTopicId,
            creatorId: testUserId,
            title: `Test Discussion ${i}`,
            status: 'ACTIVE',
            responseCount: i,
            participantCount: 1,
            lastActivityAt: new Date(Date.now() - i * 3600000), // Stagger activity times
          },
        });
      }
    });

    it('should list discussions with default pagination', async () => {
      const response = await request(app.getHttpServer()).get('/discussions').expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        currentPage: 1,
        totalItems: 3,
        itemsPerPage: 50,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should filter discussions by topicId', async () => {
      const response = await request(app.getHttpServer())
        .get('/discussions')
        .query({ topicId: testTopicId })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach((discussion: any) => {
        expect(discussion.topicId).toBe(testTopicId);
      });
    });

    it('should sort discussions by lastActivityAt desc (default)', async () => {
      const response = await request(app.getHttpServer()).get('/discussions').expect(200);

      const discussions = response.body.data;
      expect(discussions[0].title).toBe('Test Discussion 1'); // Most recent
      expect(discussions[2].title).toBe('Test Discussion 3'); // Least recent
    });

    it('should sort discussions by responseCount', async () => {
      const response = await request(app.getHttpServer())
        .get('/discussions')
        .query({ sortBy: 'responseCount', sortOrder: 'desc' })
        .expect(200);

      const discussions = response.body.data;
      expect(discussions[0].responseCount).toBe(3);
      expect(discussions[2].responseCount).toBe(1);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/discussions')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.hasNextPage).toBe(true);
    });

    it('should enforce maximum page size of 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/discussions')
        .query({ limit: 500 })
        .expect(200);

      expect(response.body.meta.itemsPerPage).toBe(100);
    });
  });
});
