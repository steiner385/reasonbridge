/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for Admin RankingAnalytics page
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
// eslint-disable-next-line import/order
import { type RankingAnalytics } from '../../../types/ranking';

// Create mock analytics data
const createMockAnalytics = (overrides: Partial<RankingAnalytics> = {}): RankingAnalytics => ({
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
      displayName: 'Top User 1',
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
    {
      userId: 'user-2',
      displayName: 'Top User 2',
      compositeScore: 0.92,
      tierLevel: 'EXPERT',
      nextTierThreshold: 1.0,
      progressToNextTier: 60,
      engagementScore: 0.9,
      qualityScore: 0.88,
      tenureBonus: 0.08,
      badges: ['leader'],
      lastCalculated: '2026-02-22T10:30:00Z',
      lastActivityAt: '2026-02-22T08:30:00Z',
    },
  ],
  ...overrides,
});

// Create mock hook return values
const createDefaultMockValues = () => ({
  useRankingAnalytics: {
    data: createMockAnalytics(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
});

let mockValues = createDefaultMockValues();

// Mock the hook
vi.mock('../../../hooks/useAdminRankingData', () => ({
  useRankingAnalytics: () => mockValues.useRankingAnalytics,
}));

// Import the component after mocks are set up
import RankingAnalyticsPage from '../RankingAnalytics';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RankingAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues = createDefaultMockValues();
  });

  describe('Loading States', () => {
    it('should show loading skeleton when analytics data is loading', () => {
      mockValues.useRankingAnalytics = {
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('ranking-analytics-skeleton')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error message when analytics data fails to load', () => {
      mockValues.useRankingAnalytics = {
        data: null,
        isLoading: false,
        error: 'Failed to load analytics',
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText(/failed to load analytics/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      mockValues.useRankingAnalytics = {
        data: null,
        isLoading: false,
        error: 'Failed to load analytics',
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Page Header', () => {
    it('should render the page title', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('heading', { name: /ranking analytics/i })).toBeInTheDocument();
    });

    it('should render the page description', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText(/overview of user ranking system/i)).toBeInTheDocument();
    });
  });

  describe('Tier Distribution Section', () => {
    it('should render tier distribution section header', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('heading', { name: /tier distribution/i })).toBeInTheDocument();
    });

    it('should display total users count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText('250')).toBeInTheDocument();
      expect(screen.getByText(/total users/i)).toBeInTheDocument();
    });

    it('should render bar chart for each tier', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('tier-bar-NEWCOMER')).toBeInTheDocument();
      expect(screen.getByTestId('tier-bar-CONTRIBUTOR')).toBeInTheDocument();
      expect(screen.getByTestId('tier-bar-TRUSTED')).toBeInTheDocument();
      expect(screen.getByTestId('tier-bar-LEADER')).toBeInTheDocument();
      expect(screen.getByTestId('tier-bar-EXPERT')).toBeInTheDocument();
    });

    it('should display tier counts', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      // Use getAllByText since some values may appear multiple times
      const newcomerBar = screen.getByTestId('tier-bar-NEWCOMER');
      expect(newcomerBar).toHaveTextContent('100');

      const contributorBar = screen.getByTestId('tier-bar-CONTRIBUTOR');
      expect(contributorBar).toHaveTextContent('80');

      const trustedBar = screen.getByTestId('tier-bar-TRUSTED');
      expect(trustedBar).toHaveTextContent('40');

      const leaderBar = screen.getByTestId('tier-bar-LEADER');
      expect(leaderBar).toHaveTextContent('20');

      const expertBar = screen.getByTestId('tier-bar-EXPERT');
      expect(expertBar).toHaveTextContent('10');
    });

    it('should display tier percentages', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      const newcomerBar = screen.getByTestId('tier-bar-NEWCOMER');
      expect(newcomerBar).toHaveTextContent('40%');

      const contributorBar = screen.getByTestId('tier-bar-CONTRIBUTOR');
      expect(contributorBar).toHaveTextContent('32%');

      const trustedBar = screen.getByTestId('tier-bar-TRUSTED');
      expect(trustedBar).toHaveTextContent('16%');

      const leaderBar = screen.getByTestId('tier-bar-LEADER');
      expect(leaderBar).toHaveTextContent('8%');

      const expertBar = screen.getByTestId('tier-bar-EXPERT');
      expect(expertBar).toHaveTextContent('4%');
    });
  });

  describe('Appeals Overview Section', () => {
    it('should render appeals section header', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('heading', { name: /appeals overview/i })).toBeInTheDocument();
    });

    it('should display pending appeals count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('appeals-pending-count')).toHaveTextContent('5');
    });

    it('should display approved appeals count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('appeals-approved-count')).toHaveTextContent('15');
    });

    it('should display denied appeals count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('appeals-denied-count')).toHaveTextContent('8');
    });

    it('should display average resolution time', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText(/48\.5/)).toBeInTheDocument();
      expect(screen.getByText(/hours/i)).toBeInTheDocument();
    });

    it('should render link to appeals queue', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      const appealsLink = screen.getByRole('link', { name: /view appeals queue/i });
      expect(appealsLink).toBeInTheDocument();
      expect(appealsLink).toHaveAttribute('href', '/admin/appeals');
    });

    it('should show urgency indicator when pending appeals > 0', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      // The urgency indicator is in the summary card (summary-appeals-pending element)
      const summaryCard = screen.getByTestId('summary-appeals-pending');
      const urgencyIndicator = summaryCard.querySelector(
        '[data-testid="appeals-urgency-indicator"]',
      );
      expect(urgencyIndicator).toBeInTheDocument();
    });
  });

  describe('Credentials Overview Section', () => {
    it('should render credentials section header', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('heading', { name: /credentials overview/i })).toBeInTheDocument();
    });

    it('should display pending credentials count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('credentials-pending-count')).toHaveTextContent('12');
    });

    it('should display verified credentials count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('credentials-verified-count')).toHaveTextContent('85');
    });

    it('should display rejected credentials count', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('credentials-rejected-count')).toHaveTextContent('23');
    });

    it('should display credential types breakdown', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText(/doctorate/i)).toBeInTheDocument();
      expect(screen.getByText(/master/i)).toBeInTheDocument();
      expect(screen.getByText(/professional license/i)).toBeInTheDocument();
      expect(screen.getByText(/industry certification/i)).toBeInTheDocument();
    });

    it('should render link to credentials review queue', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      const credentialsLink = screen.getByRole('link', { name: /view credentials queue/i });
      expect(credentialsLink).toBeInTheDocument();
      expect(credentialsLink).toHaveAttribute('href', '/admin/credentials');
    });
  });

  describe('System Health Section', () => {
    it('should render system health section header', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('heading', { name: /system health/i })).toBeInTheDocument();
    });

    it('should display last recalculation timestamp', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      // The date should be formatted for display
      expect(screen.getByTestId('last-recalculation')).toBeInTheDocument();
    });

    it('should handle null lastRecalculation', () => {
      mockValues.useRankingAnalytics = {
        data: createMockAnalytics({
          systemHealth: {
            lastRecalculation: null,
            avgCompositeScore: 0.42,
            minScore: 0.05,
            maxScore: 0.98,
            medianScore: 0.38,
          },
        }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText(/never/i)).toBeInTheDocument();
    });

    it('should display average composite score', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('avg-composite-score')).toHaveTextContent('0.42');
    });

    it('should display score range (min, max, median)', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByTestId('min-score')).toHaveTextContent('0.05');
      expect(screen.getByTestId('max-score')).toHaveTextContent('0.98');
      expect(screen.getByTestId('median-score')).toHaveTextContent('0.38');
    });
  });

  describe('Top Contributors Section', () => {
    it('should render top contributors section header', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByRole('heading', { name: /top contributors/i })).toBeInTheDocument();
    });

    it('should display top 10 users by composite score', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText('Top User 1')).toBeInTheDocument();
      expect(screen.getByText('Top User 2')).toBeInTheDocument();
    });

    it('should display user scores', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      // Use getAllByText since scores may appear in multiple places (e.g., max score)
      const scoreElements = screen.getAllByText('0.98');
      expect(scoreElements.length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText('0.92')).toBeInTheDocument();
    });

    it('should render link to full leaderboard', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      const leaderboardLink = screen.getByRole('link', { name: /view full leaderboard/i });
      expect(leaderboardLink).toBeInTheDocument();
      expect(leaderboardLink).toHaveAttribute('href', '/leaderboard');
    });

    it('should show empty state when no contributors', () => {
      mockValues.useRankingAnalytics = {
        data: createMockAnalytics({ topContributors: [] }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingAnalyticsPage />);

      expect(screen.getByText(/no contributors yet/i)).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes on main container', () => {
      const { container } = renderWithRouter(<RankingAnalyticsPage />);

      expect(container.innerHTML).toMatch(/dark:/);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(5); // Main + 4 sections
    });

    it('should have accessible links with proper labels', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should have proper ARIA labels on stats', () => {
      renderWithRouter(<RankingAnalyticsPage />);

      // Check that summary stats have aria-labels
      expect(screen.getByTestId('summary-appeals-pending')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('summary-credentials-pending')).toHaveAttribute('aria-label');
    });
  });

  describe('Responsive Layout', () => {
    it('should render with responsive grid classes', () => {
      const { container } = renderWithRouter(<RankingAnalyticsPage />);

      // Check for responsive Tailwind classes
      expect(container.innerHTML).toMatch(/sm:|md:|lg:/);
    });
  });

  describe('Admin Color Scheme', () => {
    it('should use indigo accent colors for admin theme', () => {
      const { container } = renderWithRouter(<RankingAnalyticsPage />);

      expect(container.innerHTML).toMatch(/indigo/);
    });
  });
});
