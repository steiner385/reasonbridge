/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration test for response full-text search (Issue #1290).
 *
 * Regression guard: migration 20260320232632 dropped the responses
 * `search_vector` column, but ResponsesSearchService kept querying it, so every
 * response search silently returned zero results (the error was swallowed
 * upstream). This test seeds real responses and asserts that search returns
 * non-empty results against the real database — so any future schema drift that
 * breaks response search fails CI loudly instead of failing silently.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsesSearchService } from '../responses/responses-search.service';

describe('Responses Search Integration Tests (#1290)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let searchService: ResponsesSearchService;

  const testTopicId = '00000000-0000-0000-0000-0000000a1290';
  const testUserId = '00000000-0000-0000-0000-0000000a1291';
  let testDiscussionId: string;

  // A distinctive term unlikely to appear in other seeded data.
  const UNIQUE_TERM = 'zephyrantine';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ResponsesSearchService],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    searchService = moduleRef.get<ResponsesSearchService>(ResponsesSearchService);

    // User must exist first: DiscussionTopic.creatorId is a required FK.
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: 'search-user@test.com',
        cognitoSub: 'search-test-cognito-sub-1290',
        displayName: 'Search Test User',
        emailVerified: true,
        authMethod: 'EMAIL_PASSWORD',
      },
    });

    await prisma.discussionTopic.upsert({
      where: { id: testTopicId },
      update: {},
      create: {
        id: testTopicId,
        title: 'Search Test Topic',
        description: 'Topic for response search integration testing',
        slug: 'search-test-topic-1290',
        creatorId: testUserId,
        status: 'ACTIVE',
        responseCount: 0,
        participantCount: 0,
      },
    });

    const discussion = await prisma.discussion.create({
      data: {
        topicId: testTopicId,
        creatorId: testUserId,
        title: 'Search integration discussion',
        status: 'ACTIVE',
        responseCount: 2,
        participantCount: 1,
      },
    });
    testDiscussionId = discussion.id;

    await prisma.response.createMany({
      data: [
        {
          topicId: testTopicId,
          discussionId: testDiscussionId,
          authorId: testUserId,
          content: `A matching response about ${UNIQUE_TERM} policy and its effects.`,
          version: 1,
          editCount: 0,
        },
        {
          topicId: testTopicId,
          discussionId: testDiscussionId,
          authorId: testUserId,
          content: 'An unrelated response with no matching keyword at all.',
          version: 1,
          editCount: 0,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.response.deleteMany({ where: { discussionId: testDiscussionId } });
    await prisma.discussion.delete({ where: { id: testDiscussionId } }).catch(() => {});
    await prisma.discussionTopic.delete({ where: { id: testTopicId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await moduleRef.close();
  });

  it('fullTextSearch returns non-empty results for seeded content', async () => {
    const results = await searchService.fullTextSearch(UNIQUE_TERM, { topicId: testTopicId });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('rank');
  });

  it('searchWithContext returns enriched, highlighted results', async () => {
    const results = await searchService.searchWithContext(UNIQUE_TERM, { topicId: testTopicId });
    expect(results.length).toBeGreaterThan(0);

    const [first] = results;
    expect(first!.topicTitle).toBe('Search Test Topic');
    expect(first!.topicSlug).toBe('search-test-topic-1290');
    expect(first!.topicId).toBe(testTopicId);
    // Highlighting wraps the matched term in <mark>.
    expect(first!.highlightedContent).toContain('<mark>');
    expect(first!.highlightedContent?.toLowerCase()).toContain(UNIQUE_TERM);
  });

  it('countSearchResults matches only responses containing the term', async () => {
    const count = await searchService.countSearchResults(UNIQUE_TERM, { topicId: testTopicId });
    // Exactly one of the two seeded responses contains the unique term.
    expect(count).toBe(1);
  });

  it('returns empty (not an error) when nothing matches', async () => {
    const results = await searchService.fullTextSearch('nonexistentqwerty', {
      topicId: testTopicId,
    });
    expect(results).toEqual([]);
  });
});
