/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Query Performance Integration Tests
 *
 * These tests verify that critical database queries use indexes correctly
 * and meet performance thresholds. They run EXPLAIN ANALYZE on representative
 * queries to ensure the query planner uses expected indexes.
 *
 * Prerequisites:
 * - Test database running (docker-compose.test.yml)
 * - Database schema migrated
 * - INTEGRATION_TEST_DB_READY=true (set by CI after database is confirmed available)
 *
 * Run with: pnpm test:integration
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Pool } from 'pg';
import {
  createTestPool,
  createTestPrismaClient,
  cleanupTestPrismaClient,
} from '../prisma/index.js';
import { explainAnalyze, assertQueryTiming, formatExplainSummary } from '../perf/index.js';
import type { PrismaClient } from '@prisma/client';

describe.skipIf(!process.env['DATABASE_URL'] || !process.env['INTEGRATION_TEST_DB_READY'])(
  'Query Performance - Index Verification',
  () => {
    let pool: Pool;
    let prisma: PrismaClient;
    let testUserId: string;
    let testTopicId: string;

    beforeAll(async () => {
      // Create pg pool for EXPLAIN ANALYZE
      pool = await createTestPool();

      // Create Prisma client for seeding test data
      prisma = await createTestPrismaClient();

      // Seed minimal test data for query planning
      // Note: EXPLAIN ANALYZE needs some data for accurate planning
      const user = await prisma.user.create({
        data: {
          email: 'perf-test@example.com',
          displayName: 'Perf Test User',
          cognitoSub: 'perf-test-cognito-sub',
          authMethod: 'EMAIL_PASSWORD',
          verificationLevel: 'BASIC',
          trustScoreAbility: 0.5,
          trustScoreBenevolence: 0.5,
          trustScoreIntegrity: 0.5,
          status: 'ACTIVE',
        },
      });
      testUserId = user.id;

      const topic = await prisma.discussionTopic.create({
        data: {
          title: 'Performance Test Topic',
          description: 'Topic for query performance testing',
          slug: 'perf-test-topic',
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          creatorId: testUserId,
          activityLevel: 'MEDIUM',
          isMatureContent: false,
        },
      });
      testTopicId = topic.id;
    });

    afterAll(async () => {
      // Clean up test data
      if (prisma) {
        await prisma.discussionTopic.deleteMany({
          where: { slug: 'perf-test-topic' },
        });
        await prisma.user.deleteMany({
          where: { email: 'perf-test@example.com' },
        });
        await cleanupTestPrismaClient(prisma);
      }

      if (pool) {
        await pool.end();
      }
    });

    describe('User Table Queries', () => {
      it('should use index for user lookup by id (primary key)', async () => {
        await assertQueryTiming(pool, 'SELECT * FROM users WHERE id = $1', [testUserId], {
          requireIndexScan: true,
          maxExecutionTime: 50, // Should be very fast with PK lookup
        });
      });

      it('should use index for user lookup by email', async () => {
        const result = await explainAnalyze(pool, 'SELECT * FROM users WHERE email = $1', [
          'perf-test@example.com',
        ]);

        console.log('Email lookup:', formatExplainSummary(result));

        expect(result.usedIndexScan).toBe(true);
        expect(result.usedSequentialScan).toBe(false);
        // Should use idx_users_email or similar
        expect(result.indexesUsed.length).toBeGreaterThan(0);
      });

      it('should use index for user lookup by cognitoSub', async () => {
        const result = await explainAnalyze(pool, 'SELECT * FROM users WHERE "cognitoSub" = $1', [
          'perf-test-cognito-sub',
        ]);

        console.log('CognitoSub lookup:', formatExplainSummary(result));

        expect(result.usedIndexScan).toBe(true);
        expect(result.usedSequentialScan).toBe(false);
      });

      it('should use index for displayName lookup', async () => {
        const result = await explainAnalyze(pool, 'SELECT * FROM users WHERE "displayName" = $1', [
          'Perf Test User',
        ]);

        console.log('DisplayName lookup:', formatExplainSummary(result));

        // displayName has an index
        expect(result.usedIndexScan).toBe(true);
      });
    });

    describe('Discussion Topic Queries', () => {
      it('should use index for topic lookup by slug', async () => {
        const result = await explainAnalyze(
          pool,
          'SELECT * FROM discussion_topics WHERE slug = $1',
          ['perf-test-topic'],
        );

        console.log('Slug lookup:', formatExplainSummary(result));

        expect(result.usedIndexScan).toBe(true);
      });

      it('should use index for topic filtering by status', async () => {
        const result = await explainAnalyze(
          pool,
          'SELECT * FROM discussion_topics WHERE status = $1 ORDER BY "createdAt" DESC LIMIT 20',
          ['ACTIVE'],
        );

        console.log('Status filter:', formatExplainSummary(result));

        // Should use composite index on status or status + createdAt
        expect(result.usedIndexScan).toBe(true);
      });

      it('should use composite index for status + visibility filtering', async () => {
        const result = await explainAnalyze(
          pool,
          'SELECT * FROM discussion_topics WHERE status = $1 AND visibility = $2',
          ['ACTIVE', 'PUBLIC'],
        );

        console.log('Status+Visibility filter:', formatExplainSummary(result));

        // Should use the composite index discussion_topics_status_visibility_idx
        expect(result.usedIndexScan).toBe(true);
      });

      it('should use index for topics ordered by activity', async () => {
        const result = await explainAnalyze(
          pool,
          'SELECT * FROM discussion_topics WHERE status = $1 ORDER BY "lastActivityAt" DESC LIMIT 10',
          ['ACTIVE'],
        );

        console.log('Activity ordering:', formatExplainSummary(result));

        expect(result.usedIndexScan).toBe(true);
      });
    });

    describe('User Follow Queries', () => {
      it('should use index for follower count query', async () => {
        const result = await explainAnalyze(
          pool,
          'SELECT COUNT(*) FROM user_follows WHERE "followedId" = $1',
          [testUserId],
        );

        console.log('Follower count:', formatExplainSummary(result));

        expect(result.usedIndexScan).toBe(true);
      });

      it('should use index for following count query', async () => {
        const result = await explainAnalyze(
          pool,
          'SELECT COUNT(*) FROM user_follows WHERE "followerId" = $1',
          [testUserId],
        );

        console.log('Following count:', formatExplainSummary(result));

        expect(result.usedIndexScan).toBe(true);
      });
    });

    describe('Performance Thresholds', () => {
      it('primary key lookups should be under 10ms', async () => {
        await assertQueryTiming(pool, 'SELECT * FROM users WHERE id = $1', [testUserId], {
          maxExecutionTime: 10,
          requireIndexScan: true,
        });
      });

      it('indexed field lookups should be under 50ms', async () => {
        await assertQueryTiming(
          pool,
          'SELECT * FROM users WHERE email = $1',
          ['perf-test@example.com'],
          {
            maxExecutionTime: 50,
            requireIndexScan: true,
          },
        );
      });

      it('paginated listing should be under 100ms', async () => {
        await assertQueryTiming(
          pool,
          'SELECT * FROM discussion_topics WHERE status = $1 ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0',
          ['ACTIVE'],
          {
            maxExecutionTime: 100,
          },
        );
      });
    });
  },
);
