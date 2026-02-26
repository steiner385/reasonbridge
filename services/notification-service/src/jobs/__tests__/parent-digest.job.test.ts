/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { ParentDigestJob } from '../parent-digest.job.js';
import type { ChildActivityData } from '../parent-digest.job.js';

/**
 * Create mock PrismaService with all required methods
 */
const createMockPrismaService = () => ({
  user: {
    findMany: vi.fn(),
  },
  response: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  moderationAction: {
    count: vi.fn(),
  },
  discussionTopic: {
    findMany: vi.fn(),
  },
});

/**
 * Create mock EmailService
 */
const createMockEmailService = () => ({
  sendDigestEmail: vi.fn(),
});

/**
 * Create mock Logger
 */
const createMockLogger = () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

describe('ParentDigestJob', () => {
  let job: ParentDigestJob;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEmailService: ReturnType<typeof createMockEmailService>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let loggerSpy: { log: MockInstance; warn: MockInstance; error: MockInstance };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockEmailService = createMockEmailService();
    mockLogger = createMockLogger();
    job = new ParentDigestJob(mockPrisma as any, mockEmailService as any);

    // Spy on the job's logger
    loggerSpy = {
      log: vi.spyOn((job as any).logger, 'log').mockImplementation(() => {}),
      warn: vi.spyOn((job as any).logger, 'warn').mockImplementation(() => {}),
      error: vi.spyOn((job as any).logger, 'error').mockImplementation(() => {}),
    };
  });

  describe('handleCron', () => {
    it('should process eligible children and send digest emails', async () => {
      // Mock eligible children
      const eligibleChildren: ChildActivityData[] = [
        {
          childId: 'child-1',
          childName: 'Alex',
          parentEmail: 'parent1@example.com',
          parentName: 'Jane Doe',
          topicsParticipated: [{ id: 'topic-1', name: 'Climate Change', responseCount: 3 }],
          totalResponses: 3,
          approximateHoursActive: 2,
          safetyConcernsCount: 0,
          dashboardToken: 'token-1',
        },
      ];

      // Set up mock to return eligible children
      vi.spyOn(job, 'getEligibleChildren').mockResolvedValue(eligibleChildren);
      vi.spyOn(job, 'sendDigest').mockResolvedValue();

      await job.handleCron();

      expect(job.getEligibleChildren).toHaveBeenCalled();
      expect(job.sendDigest).toHaveBeenCalledWith(eligibleChildren[0]);
      expect(loggerSpy.log).toHaveBeenCalledWith(expect.stringContaining('Starting'));
      expect(loggerSpy.log).toHaveBeenCalledWith(expect.stringContaining('1 digest'));
    });

    it('should handle no eligible children gracefully', async () => {
      vi.spyOn(job, 'getEligibleChildren').mockResolvedValue([]);
      vi.spyOn(job, 'sendDigest').mockResolvedValue();

      await job.handleCron();

      expect(job.getEligibleChildren).toHaveBeenCalled();
      expect(job.sendDigest).not.toHaveBeenCalled();
      expect(loggerSpy.log).toHaveBeenCalledWith(expect.stringContaining('no digests'));
    });

    it('should continue processing other children if one email fails', async () => {
      const eligibleChildren: ChildActivityData[] = [
        {
          childId: 'child-1',
          childName: 'Alex',
          parentEmail: 'parent1@example.com',
          parentName: 'Jane Doe',
          topicsParticipated: [],
          totalResponses: 0,
          approximateHoursActive: 0,
          safetyConcernsCount: 0,
          dashboardToken: 'token-1',
        },
        {
          childId: 'child-2',
          childName: 'Jordan',
          parentEmail: 'parent2@example.com',
          parentName: 'John Smith',
          topicsParticipated: [],
          totalResponses: 5,
          approximateHoursActive: 1,
          safetyConcernsCount: 0,
          dashboardToken: 'token-2',
        },
      ];

      vi.spyOn(job, 'getEligibleChildren').mockResolvedValue(eligibleChildren);
      const sendDigestSpy = vi
        .spyOn(job, 'sendDigest')
        .mockRejectedValueOnce(new Error('Email failed'))
        .mockResolvedValueOnce();

      await job.handleCron();

      // Should attempt both, not stop after first failure
      expect(sendDigestSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send digest'),
        expect.any(String),
      );
    });
  });

  describe('getEligibleChildren', () => {
    it('should query users with verified parental consent', async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Mock user query to return a minor with verified consent
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'child-1',
          displayName: 'Alex',
          parentEmail: 'parent@example.com',
          parentalConsent: {
            parentEmail: 'parent@example.com',
            consentToken: 'dashboard-token-123',
          },
          createdAt: new Date(),
        },
      ]);

      // Mock response query for activity data
      mockPrisma.response.count.mockResolvedValue(5);
      mockPrisma.response.findMany.mockResolvedValue([
        { topicId: 'topic-1', createdAt: new Date() },
        { topicId: 'topic-1', createdAt: new Date() },
        { topicId: 'topic-2', createdAt: new Date() },
      ]);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([
        { id: 'topic-1', title: 'Climate Change' },
        { id: 'topic-2', title: 'Space Exploration' },
      ]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);

      const result = await job.getEligibleChildren();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isMinor: true,
            parentConsentStatus: 'VERIFIED',
          }),
        }),
      );
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no eligible children exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await job.getEligibleChildren();

      expect(result).toEqual([]);
    });
  });

  describe('gatherChildActivity', () => {
    it('should calculate activity metrics for the past week', async () => {
      const childId = 'child-1';

      // Mock responses for the child
      mockPrisma.response.findMany.mockResolvedValue([
        { id: 'r1', topicId: 'topic-1', createdAt: new Date() },
        { id: 'r2', topicId: 'topic-1', createdAt: new Date() },
        { id: 'r3', topicId: 'topic-2', createdAt: new Date() },
      ]);

      mockPrisma.response.count.mockResolvedValue(3);

      mockPrisma.discussionTopic.findMany.mockResolvedValue([
        { id: 'topic-1', title: 'Climate Change' },
        { id: 'topic-2', title: 'Technology Ethics' },
      ]);

      mockPrisma.moderationAction.count.mockResolvedValue(1);

      const activity = await job.gatherChildActivity(childId);

      expect(activity.totalResponses).toBe(3);
      expect(activity.topicsParticipated).toHaveLength(2);
      expect(activity.safetyConcernsCount).toBe(1);
      expect(activity.approximateHoursActive).toBeGreaterThanOrEqual(0);
    });

    it('should handle a child with no activity gracefully', async () => {
      const childId = 'child-inactive';

      mockPrisma.response.findMany.mockResolvedValue([]);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);

      const activity = await job.gatherChildActivity(childId);

      expect(activity.totalResponses).toBe(0);
      expect(activity.topicsParticipated).toEqual([]);
      expect(activity.safetyConcernsCount).toBe(0);
      expect(activity.approximateHoursActive).toBe(0);
    });

    it('should calculate approximate hours based on response count', async () => {
      const childId = 'child-active';

      // 10 responses should estimate some hours
      const responses = Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        topicId: 'topic-1',
        createdAt: new Date(),
      }));

      mockPrisma.response.findMany.mockResolvedValue(responses);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([{ id: 'topic-1', title: 'Test' }]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);

      const activity = await job.gatherChildActivity(childId);

      // Approximate hours should be non-zero for active child
      expect(activity.approximateHoursActive).toBeGreaterThan(0);
    });
  });

  describe('sendDigest', () => {
    it('should generate email using template and send via email service', async () => {
      const activityData: ChildActivityData = {
        childId: 'child-1',
        childName: 'Alex',
        parentEmail: 'parent@example.com',
        parentName: 'Jane Doe',
        topicsParticipated: [{ id: 'topic-1', name: 'Climate Change', responseCount: 3 }],
        totalResponses: 3,
        approximateHoursActive: 2,
        safetyConcernsCount: 0,
        dashboardToken: 'token-123',
      };

      mockEmailService.sendDigestEmail.mockResolvedValue(undefined);

      await job.sendDigest(activityData);

      expect(mockEmailService.sendDigestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@example.com',
          subject: expect.stringContaining('Alex'),
        }),
      );
    });

    it('should throw error when email sending fails', async () => {
      const activityData: ChildActivityData = {
        childId: 'child-1',
        childName: 'Alex',
        parentEmail: 'parent@example.com',
        parentName: 'Jane Doe',
        topicsParticipated: [],
        totalResponses: 0,
        approximateHoursActive: 0,
        safetyConcernsCount: 0,
        dashboardToken: 'token-123',
      };

      const error = new Error('SES rate limit exceeded');
      mockEmailService.sendDigestEmail.mockRejectedValue(error);

      await expect(job.sendDigest(activityData)).rejects.toThrow('SES rate limit exceeded');
    });
  });

  describe('getWeekDateRange', () => {
    it('should return correct week start and end dates', () => {
      // Access private method via prototype or make it public for testing
      const { weekStart, weekEnd } = (job as any).getWeekDateRange();

      // Week end should be today/now
      expect(weekEnd).toBeInstanceOf(Date);

      // Week start should be 7 days before week end
      const daysDiff = (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(7);
    });
  });
});
