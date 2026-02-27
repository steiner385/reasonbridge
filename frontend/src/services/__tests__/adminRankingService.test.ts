/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for adminRankingService
 * Tests for admin ranking analytics API service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { adminRankingService } from '../adminRankingService';
import type { RankingAnalytics } from '../../types/ranking';

// The apiClient uses window.location.origin + /api as base URL
// In tests, window.location.origin is typically 'http://localhost:3000'
const API_BASE = 'http://localhost:3000/api';

const mockAnalytics: RankingAnalytics = {
  tierDistribution: [
    { tier: 'NEWCOMER', count: 100, percentage: 40 },
    { tier: 'CONTRIBUTOR', count: 80, percentage: 32 },
    { tier: 'TRUSTED', count: 40, percentage: 16 },
    { tier: 'LEADER', count: 20, percentage: 8 },
    { tier: 'EXPERT', count: 10, percentage: 4 },
  ],
  totalUsers: 250,
  appeals: {
    pending: 5,
    approved: 15,
    denied: 8,
    avgResolutionHours: 48.5,
  },
  credentials: {
    pending: 12,
    verified: 85,
    rejected: 23,
    byType: [
      { type: 'ACADEMIC_DOCTORATE', count: 25 },
      { type: 'ACADEMIC_MASTERS', count: 35 },
      { type: 'PROFESSIONAL_LICENSE', count: 20 },
      { type: 'INDUSTRY_CERTIFICATION', count: 28 },
    ],
  },
  systemHealth: {
    lastRecalculation: '2026-02-22T10:30:00Z',
    avgCompositeScore: 0.42,
    minScore: 0.05,
    maxScore: 0.98,
    medianScore: 0.38,
  },
  topContributors: [
    {
      userId: 'user-1',
      displayName: 'Top User',
      compositeScore: 0.98,
      tierLevel: 'EXPERT',
      nextTierThreshold: 1.0,
      progressToNextTier: 90,
      engagementScore: 0.95,
      qualityScore: 0.92,
      tenureBonus: 0.1,
      badges: ['expert', 'verified'],
      lastCalculated: '2026-02-22T10:30:00Z',
      lastActivityAt: '2026-02-22T09:00:00Z',
    },
  ],
};

describe('adminRankingService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('getRankingAnalytics', () => {
    it('should fetch ranking analytics from the API', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json(mockAnalytics);
        }),
      );

      const result = await adminRankingService.getRankingAnalytics();

      expect(result).toEqual(mockAnalytics);
      expect(result.totalUsers).toBe(250);
      expect(result.tierDistribution).toHaveLength(5);
      expect(result.topContributors).toHaveLength(1);
    });

    it('should include auth token from localStorage', async () => {
      localStorage.setItem('authToken', 'admin-token-123');

      let capturedHeaders: Headers | null = null;
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, ({ request }) => {
          capturedHeaders = new Headers(request.headers);
          return HttpResponse.json(mockAnalytics);
        }),
      );

      await adminRankingService.getRankingAnalytics();

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer admin-token-123');
    });

    it('should include auth token from sessionStorage if not in localStorage', async () => {
      sessionStorage.setItem('authToken', 'session-admin-token');

      let capturedHeaders: Headers | null = null;
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, ({ request }) => {
          capturedHeaders = new Headers(request.headers);
          return HttpResponse.json(mockAnalytics);
        }),
      );

      await adminRankingService.getRankingAnalytics();

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer session-admin-token');
    });

    it('should throw error when API returns 401 Unauthorized', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }),
      );

      await expect(adminRankingService.getRankingAnalytics()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when API returns 403 Forbidden', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json({ message: 'Admin access required' }, { status: 403 });
        }),
      );

      await expect(adminRankingService.getRankingAnalytics()).rejects.toThrow(
        'Request failed: Forbidden',
      );
    });

    it('should throw error when API returns 500 error', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
        }),
      );

      await expect(adminRankingService.getRankingAnalytics()).rejects.toThrow(
        'Request failed: Internal Server Error',
      );
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(adminRankingService.getRankingAnalytics()).rejects.toThrow();
    });
  });

  describe('tier distribution analytics', () => {
    it('should return correct tier distribution structure', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json(mockAnalytics);
        }),
      );

      const result = await adminRankingService.getRankingAnalytics();

      const newcomerTier = result.tierDistribution.find((t) => t.tier === 'NEWCOMER');
      expect(newcomerTier).toBeDefined();
      expect(newcomerTier?.count).toBe(100);
      expect(newcomerTier?.percentage).toBe(40);

      const expertTier = result.tierDistribution.find((t) => t.tier === 'EXPERT');
      expect(expertTier).toBeDefined();
      expect(expertTier?.count).toBe(10);
      expect(expertTier?.percentage).toBe(4);
    });
  });

  describe('appeals analytics', () => {
    it('should return correct appeals structure', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json(mockAnalytics);
        }),
      );

      const result = await adminRankingService.getRankingAnalytics();

      expect(result.appeals.pending).toBe(5);
      expect(result.appeals.approved).toBe(15);
      expect(result.appeals.denied).toBe(8);
      expect(result.appeals.avgResolutionHours).toBe(48.5);
    });
  });

  describe('credentials analytics', () => {
    it('should return correct credentials structure', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json(mockAnalytics);
        }),
      );

      const result = await adminRankingService.getRankingAnalytics();

      expect(result.credentials.pending).toBe(12);
      expect(result.credentials.verified).toBe(85);
      expect(result.credentials.rejected).toBe(23);
      expect(result.credentials.byType).toHaveLength(4);

      const doctorates = result.credentials.byType.find((c) => c.type === 'ACADEMIC_DOCTORATE');
      expect(doctorates?.count).toBe(25);
    });
  });

  describe('system health analytics', () => {
    it('should return correct system health structure', async () => {
      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json(mockAnalytics);
        }),
      );

      const result = await adminRankingService.getRankingAnalytics();

      expect(result.systemHealth.lastRecalculation).toBe('2026-02-22T10:30:00Z');
      expect(result.systemHealth.avgCompositeScore).toBe(0.42);
      expect(result.systemHealth.minScore).toBe(0.05);
      expect(result.systemHealth.maxScore).toBe(0.98);
      expect(result.systemHealth.medianScore).toBe(0.38);
    });

    it('should handle null lastRecalculation', async () => {
      const analyticsWithNullRecalc = {
        ...mockAnalytics,
        systemHealth: {
          ...mockAnalytics.systemHealth,
          lastRecalculation: null,
        },
      };

      server.use(
        http.get(`${API_BASE}/admin/ranking/analytics`, () => {
          return HttpResponse.json(analyticsWithNullRecalc);
        }),
      );

      const result = await adminRankingService.getRankingAnalytics();

      expect(result.systemHealth.lastRecalculation).toBeNull();
    });
  });
});
