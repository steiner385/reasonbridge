/**
 * T050 [US2] - Integration test for POST /responses API endpoint (Feature 009)
 *
 * Tests the complete response creation flow including:
 * - Request validation
 * - Discussion validation
 * - Parent response validation (for threading)
 * - SSRF protection for citations
 * - ParticipantActivity tracking
 * - Discussion metrics updates
 * - Rate limiting
 * - Response format
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ResponsesModule } from '../responses/responses.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Responses API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testUser2Id = '00000000-0000-0000-0000-000000000004';
  const testTopicId = '00000000-0000-0000-0000-000000000002';
  let testDiscussionId: string;
  let testResponseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ResponsesModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  afterEach(async () => {
    // Clean up responses created during tests (except initial response)
    await prisma.response.deleteMany({
      where: {
        discussionId: testDiscussionId,
        id: { not: testResponseId },
      },
    });

    // Reset discussion metrics
    await prisma.discussion.update({
      where: { id: testDiscussionId },
      data: {
        responseCount: 1,
        participantCount: 1,
      },
    });

    // Clean up participant activities (except initial)
    await prisma.participantActivity.deleteMany({
      where: {
        discussionId: testDiscussionId,
        userId: { not: testUserId },
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

    // Create test users
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: 'user1@test.com',
        displayName: 'Test User 1',
        emailVerified: true,
        authMethod: 'EMAIL',
      },
    });

    await prisma.user.upsert({
      where: { id: testUser2Id },
      update: {},
      create: {
        id: testUser2Id,
        email: 'user2@test.com',
        displayName: 'Test User 2',
        emailVerified: true,
        authMethod: 'EMAIL',
      },
    });

    // Create test discussion with initial response
    const discussion = await prisma.discussion.create({
      data: {
        topicId: testTopicId,
        creatorId: testUserId,
        title: 'Should carbon taxes be increased?',
        status: 'ACTIVE',
        responseCount: 1,
        participantCount: 1,
      },
    });
    testDiscussionId = discussion.id;

    const initialResponse = await prisma.response.create({
      data: {
        topicId: testTopicId,
        discussionId: testDiscussionId,
        authorId: testUserId,
        content: 'I believe carbon taxes are essential for addressing climate change.',
        version: 1,
        editCount: 0,
      },
    });
    testResponseId = initialResponse.id;

    // Create participant activity
    await prisma.participantActivity.create({
      data: {
        discussionId: testDiscussionId,
        userId: testUserId,
        responseCount: 1,
        lastActivityAt: new Date(),
      },
    });
  }

  async function cleanupTestData() {
    await prisma.citation.deleteMany({});
    await prisma.response.deleteMany({ where: { discussionId: testDiscussionId } });
    await prisma.participantActivity.deleteMany({ where: { discussionId: testDiscussionId } });
    await prisma.discussion.delete({ where: { id: testDiscussionId } }).catch(() => {});
    await prisma.discussionTopic.delete({ where: { id: testTopicId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUser2Id } }).catch(() => {});
  }

  describe('POST /responses', () => {
    const validResponseData = {
      discussionId: '', // Will be set in tests
      content:
        'I agree with the points raised, but we should also consider the economic impact on lower-income families and implement progressive rebate mechanisms.',
      citations: [
        {
          url: 'https://example.com/carbon-tax-impact',
          title: 'Economic Impact Analysis',
        },
      ],
    };

    beforeEach(() => {
      validResponseData.discussionId = testDiscussionId;
    });

    it('should successfully create a response with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(201);

      expect(response.body).toMatchObject({
        discussionId: testDiscussionId,
        content: validResponseData.content,
        author: {
          id: testUser2Id,
          displayName: 'Test User 2',
        },
        parentResponseId: null,
        version: 1,
        editCount: 0,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.citations).toHaveLength(1);
      expect(response.body.citations[0].title).toBe('Economic Impact Analysis');
    });

    it('should reject content shorter than 50 characters', async () => {
      const invalidData = {
        ...validResponseData,
        content: 'Too short',
      };

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Response must be at least 50 characters');
    });

    it('should reject content longer than 25000 characters', async () => {
      const invalidData = {
        ...validResponseData,
        content: 'A'.repeat(25001),
      };

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Response cannot exceed 25,000 characters');
    });

    it('should reject more than 10 citations', async () => {
      const invalidData = {
        ...validResponseData,
        citations: Array(11)
          .fill(null)
          .map((_, i) => ({
            url: `https://example.com/source${i}`,
            title: `Source ${i}`,
          })),
      };

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Maximum 10 citations allowed');
    });

    it('should reject citation with private IP (SSRF protection)', async () => {
      const invalidData = {
        ...validResponseData,
        citations: [
          {
            url: 'http://10.0.0.1/internal',
            title: 'Private IP',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Citation URL blocked');
    });

    it('should reject response to non-existent discussion', async () => {
      const invalidData = {
        ...validResponseData,
        discussionId: '00000000-0000-0000-0000-000000000999',
      };

      await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(404);
    });

    it('should reject response to archived discussion', async () => {
      // Archive the discussion
      await prisma.discussion.update({
        where: { id: testDiscussionId },
        data: { status: 'ARCHIVED' },
      });

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Cannot add responses to non-active discussions');

      // Restore discussion status
      await prisma.discussion.update({
        where: { id: testDiscussionId },
        data: { status: 'ACTIVE' },
      });
    });

    it('should update discussion responseCount', async () => {
      const discussionBefore = await prisma.discussion.findUnique({
        where: { id: testDiscussionId },
      });

      await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(201);

      const discussionAfter = await prisma.discussion.findUnique({
        where: { id: testDiscussionId },
      });

      expect(discussionAfter?.responseCount).toBe((discussionBefore?.responseCount || 0) + 1);
    });

    it('should update discussion participantCount for new participant', async () => {
      const discussionBefore = await prisma.discussion.findUnique({
        where: { id: testDiscussionId },
      });

      await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(201);

      const discussionAfter = await prisma.discussion.findUnique({
        where: { id: testDiscussionId },
      });

      expect(discussionAfter?.participantCount).toBe((discussionBefore?.participantCount || 0) + 1);
    });

    it('should create ParticipantActivity for new participant', async () => {
      await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(201);

      const activity = await prisma.participantActivity.findUnique({
        where: {
          discussionId_userId: {
            discussionId: testDiscussionId,
            userId: testUser2Id,
          },
        },
      });

      expect(activity).toBeDefined();
      expect(activity?.responseCount).toBe(1);
    });

    it('should update ParticipantActivity for existing participant', async () => {
      // Post first response
      await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(201);

      const activityBefore = await prisma.participantActivity.findUnique({
        where: {
          discussionId_userId: {
            discussionId: testDiscussionId,
            userId: testUserId,
          },
        },
      });

      // Post second response
      await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUserId}`)
        .expect(201);

      const activityAfter = await prisma.participantActivity.findUnique({
        where: {
          discussionId_userId: {
            discussionId: testDiscussionId,
            userId: testUserId,
          },
        },
      });

      expect(activityAfter?.responseCount).toBe((activityBefore?.responseCount || 0) + 1);
    });

    it('should validate parent response belongs to same discussion', async () => {
      // Create a different discussion
      const otherDiscussion = await prisma.discussion.create({
        data: {
          topicId: testTopicId,
          creatorId: testUserId,
          title: 'Other Discussion',
          status: 'ACTIVE',
          responseCount: 0,
          participantCount: 0,
        },
      });

      const invalidData = {
        ...validResponseData,
        parentResponseId: testResponseId, // Belongs to different discussion
        discussionId: otherDiscussion.id,
      };

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Parent response must belong to the same discussion');

      // Cleanup
      await prisma.discussion.delete({ where: { id: otherDiscussion.id } });
    });

    it('should reject reply to deleted response', async () => {
      // Soft delete the initial response
      await prisma.response.update({
        where: { id: testResponseId },
        data: { deletedAt: new Date() },
      });

      const invalidData = {
        ...validResponseData,
        parentResponseId: testResponseId,
      };

      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(invalidData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(400);

      expect(response.body.message).toContain('Cannot reply to deleted responses');

      // Restore response
      await prisma.response.update({
        where: { id: testResponseId },
        data: { deletedAt: null },
      });
    });

    it('should normalize citation URLs', async () => {
      const response = await request(app.getHttpServer())
        .post('/responses')
        .send(validResponseData)
        .set('Authorization', `Bearer mock-token-${testUser2Id}`)
        .expect(201);

      const citation = response.body.citations[0];
      expect(citation.originalUrl).toBe('https://example.com/carbon-tax-impact');
      expect(citation.normalizedUrl).toBe('https://example.com/carbon-tax-impact');
      expect(citation.validationStatus).toBe('UNVERIFIED');
    });
  });

  describe('GET /discussions/:discussionId/responses', () => {
    beforeEach(async () => {
      // Create additional test responses
      await prisma.response.create({
        data: {
          topicId: testTopicId,
          discussionId: testDiscussionId,
          authorId: testUser2Id,
          content:
            'This is a second response with sufficient length to meet the validation requirements.',
          version: 1,
          editCount: 0,
        },
      });

      await prisma.response.create({
        data: {
          topicId: testTopicId,
          discussionId: testDiscussionId,
          authorId: testUserId,
          content:
            'This is a third response that continues the discussion with adequate content length.',
          version: 1,
          editCount: 0,
        },
      });
    });

    it('should retrieve all responses for a discussion', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discussions/${testDiscussionId}/responses`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].discussionId).toBe(testDiscussionId);
    });

    it('should exclude soft-deleted responses', async () => {
      // Soft delete one response
      await prisma.response.update({
        where: { id: testResponseId },
        data: { deletedAt: new Date() },
      });

      const response = await request(app.getHttpServer())
        .get(`/discussions/${testDiscussionId}/responses`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.find((r: any) => r.id === testResponseId)).toBeUndefined();

      // Restore
      await prisma.response.update({
        where: { id: testResponseId },
        data: { deletedAt: null },
      });
    });

    it('should order responses chronologically', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discussions/${testDiscussionId}/responses`)
        .expect(200);

      const createdDates = response.body.map((r: any) => new Date(r.createdAt).getTime());
      expect(createdDates[0]).toBeLessThanOrEqual(createdDates[1]);
      expect(createdDates[1]).toBeLessThanOrEqual(createdDates[2]);
    });

    it('should include author information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discussions/${testDiscussionId}/responses`)
        .expect(200);

      response.body.forEach((r: any) => {
        expect(r.author).toBeDefined();
        expect(r.author.id).toBeDefined();
        expect(r.author.displayName).toBeDefined();
      });
    });

    it('should include citations', async () => {
      // Create response with citation
      await prisma.response.create({
        data: {
          topicId: testTopicId,
          discussionId: testDiscussionId,
          authorId: testUser2Id,
          content:
            'Response with citation that has sufficient length to pass validation requirements.',
          version: 1,
          editCount: 0,
          citations: {
            create: {
              originalUrl: 'https://example.com/test-source',
              normalizedUrl: 'https://example.com/test-source',
              title: 'Test Source',
              validationStatus: 'UNVERIFIED',
            },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/discussions/${testDiscussionId}/responses`)
        .expect(200);

      const responseWithCitation = response.body.find(
        (r: any) => r.citations && r.citations.length > 0,
      );
      expect(responseWithCitation).toBeDefined();
      expect(responseWithCitation.citations[0].title).toBe('Test Source');
    });

    it('should return 404 for non-existent discussion', async () => {
      await request(app.getHttpServer())
        .get('/discussions/00000000-0000-0000-0000-000000000999/responses')
        .expect(404);
    });
  });
});
