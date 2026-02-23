/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for RankingDashboard page
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { UserRank, TopicExpertise, Credential } from '../../../types/ranking';
import type { Appeal } from '../../../types/moderation';

// Test data factories
const createMockRank = (overrides: Partial<UserRank> = {}): UserRank => ({
  userId: 'user-123',
  displayName: 'Test User',
  compositeScore: 0.45,
  tierLevel: 'TRUSTED',
  nextTierThreshold: 0.6,
  progressToNextTier: 25,
  engagementScore: 0.4,
  qualityScore: 0.5,
  tenureBonus: 0.027,
  badges: ['badge-1', 'badge-2'],
  lastCalculated: '2025-01-15T10:00:00Z',
  lastActivityAt: '2025-01-15T09:30:00Z',
  ...overrides,
});

const createMockExpertise = (overrides: Partial<TopicExpertise> = {}): TopicExpertise => ({
  userId: 'user-123',
  tagId: 'tag-1',
  tagName: 'Climate Science',
  expertiseScore: 0.65,
  expertiseLevel: 'KNOWLEDGEABLE',
  responseCount: 42,
  progressToNextLevel: 60,
  lastActive: '2025-01-15T09:30:00Z',
  ...overrides,
});

const createMockCredential = (overrides: Partial<Credential> = {}): Credential => ({
  id: 'cred-1',
  userId: 'user-123',
  tagId: 'tag-1',
  tagName: 'Climate Science',
  type: 'ACADEMIC_DOCTORATE',
  title: 'PhD in Climate Science',
  institution: 'Stanford University',
  status: 'VERIFIED',
  boostValue: 0.15,
  createdAt: '2025-01-10T10:00:00Z',
  ...overrides,
});

const createMockAppeal = (overrides: Partial<Appeal> = {}): Appeal => ({
  id: 'appeal-1',
  moderationActionId: 'mod-1',
  appellantId: 'user-123',
  reason: 'I disagree with this decision',
  status: 'pending',
  createdAt: '2025-01-12T10:00:00Z',
  ...overrides,
});

// Create mock hook return values that can be modified per test
const createDefaultMockValues = () => ({
  useMyRanking: {
    data: createMockRank(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  useMyExpertise: {
    data: [createMockExpertise()],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  useMyCredentials: {
    data: [createMockCredential()],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  useMyAppeals: {
    data: [] as Appeal[],
    isLoading: false,
    error: null,
    canSubmit: true,
    cooldownEndsAt: null,
    refetch: vi.fn(),
  },
  useLeaderboardPreview: {
    data: [
      createMockRank({
        userId: 'top-1',
        displayName: 'Top User 1',
        compositeScore: 0.95,
        tierLevel: 'EXPERT',
      }),
      createMockRank({
        userId: 'top-2',
        displayName: 'Top User 2',
        compositeScore: 0.92,
        tierLevel: 'EXPERT',
      }),
      createMockRank({
        userId: 'top-3',
        displayName: 'Top User 3',
        compositeScore: 0.88,
        tierLevel: 'LEADER',
      }),
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
});

let mockValues = createDefaultMockValues();

// Mock the hooks module
vi.mock('../../../hooks/useRankingData', () => ({
  useMyRanking: () => mockValues.useMyRanking,
  useMyExpertise: () => mockValues.useMyExpertise,
  useMyCredentials: () => mockValues.useMyCredentials,
  useMyAppeals: () => mockValues.useMyAppeals,
  useLeaderboardPreview: () => mockValues.useLeaderboardPreview,
}));

// Mock the ranking service
vi.mock('../../../services/rankingService', () => ({
  rankingService: {
    submitCredential: vi.fn().mockResolvedValue({}),
    submitAppeal: vi.fn().mockResolvedValue({}),
  },
}));

// Mock the tag service
vi.mock('../../../services/tagService', () => ({
  tagService: {
    getPopularTags: vi.fn().mockResolvedValue([
      { id: 'tag-1', name: 'Climate Science' },
      { id: 'tag-2', name: 'Economics' },
    ]),
  },
}));

// Import the component after mocks are set up
import RankingDashboard from '../RankingDashboard';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RankingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues = createDefaultMockValues();
  });

  describe('Loading States', () => {
    it('should show loading skeleton when ranking data is loading', () => {
      mockValues.useMyRanking = {
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByTestId('ranking-dashboard-skeleton')).toBeInTheDocument();
    });

    it('should show loading skeleton when expertise data is loading', () => {
      mockValues.useMyExpertise = {
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByTestId('ranking-dashboard-skeleton')).toBeInTheDocument();
    });
  });

  describe('Global Ranking Section', () => {
    it('should render the page title', () => {
      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /my ranking/i })).toBeInTheDocument();
    });

    it('should render TierProgressCard with user rank data', () => {
      renderWithRouter(<RankingDashboard />);

      // TierProgressCard displays tier name
      expect(screen.getByText('Trusted')).toBeInTheDocument();
      // TierProgressCard displays score
      expect(screen.getByText('0.450')).toBeInTheDocument();
    });

    it('should render leaderboard preview section', () => {
      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /top contributors/i })).toBeInTheDocument();
      expect(screen.getByText('Top User 1')).toBeInTheDocument();
      expect(screen.getByText('Top User 2')).toBeInTheDocument();
    });

    it('should render link to full leaderboard', () => {
      renderWithRouter(<RankingDashboard />);

      const leaderboardLink = screen.getByRole('link', { name: /view full leaderboard/i });
      expect(leaderboardLink).toBeInTheDocument();
      expect(leaderboardLink).toHaveAttribute('href', '/leaderboard');
    });
  });

  describe('Domain Expertise Section', () => {
    it('should render expertise section header', () => {
      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /domain expertise/i })).toBeInTheDocument();
    });

    it('should render expertise badges for each domain', () => {
      mockValues.useMyExpertise = {
        data: [
          createMockExpertise({
            tagId: 'tag-1',
            tagName: 'Climate Science',
            expertiseLevel: 'KNOWLEDGEABLE',
          }),
          createMockExpertise({ tagId: 'tag-2', tagName: 'Economics', expertiseLevel: 'FAMILIAR' }),
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText('Climate Science')).toBeInTheDocument();
      expect(screen.getByText('Economics')).toBeInTheDocument();
    });

    it('should show empty state when no expertise data', () => {
      mockValues.useMyExpertise = {
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText(/no domain expertise yet/i)).toBeInTheDocument();
    });

    it('should render link to view full expertise breakdown', () => {
      renderWithRouter(<RankingDashboard />);

      const expertiseLink = screen.getByRole('link', { name: /view full expertise/i });
      expect(expertiseLink).toBeInTheDocument();
    });
  });

  describe('Credentials Section', () => {
    it('should render credentials section header', () => {
      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /credentials/i })).toBeInTheDocument();
    });

    it('should render verified credentials with status badges', () => {
      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText('PhD in Climate Science')).toBeInTheDocument();
      expect(screen.getByText(/verified/i)).toBeInTheDocument();
    });

    it('should render pending credentials with review status', () => {
      mockValues.useMyCredentials = {
        data: [createMockCredential({ status: 'PENDING' })],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText(/pending review/i)).toBeInTheDocument();
    });

    it('should render Add Credential button', () => {
      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
    });

    it('should open credential modal when Add Credential is clicked', async () => {
      const user = userEvent.setup();

      renderWithRouter(<RankingDashboard />);

      const addButton = screen.getByRole('button', { name: /add credential/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /add credential/i })).toBeInTheDocument();
      });
    });

    it('should close credential modal when cancel is clicked', async () => {
      const user = userEvent.setup();

      renderWithRouter(<RankingDashboard />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /add credential/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when no credentials', () => {
      mockValues.useMyCredentials = {
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText(/no credentials submitted yet/i)).toBeInTheDocument();
    });
  });

  describe('Appeals Section', () => {
    it('should render appeals section with Submit Appeal button when user can submit', () => {
      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: true,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      // Appeals section should be visible with Submit Appeal button
      expect(screen.getByRole('heading', { name: /appeals/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit appeal/i })).toBeInTheDocument();
    });

    it('should not render Submit Appeal button when user cannot submit', () => {
      mockValues.useMyAppeals = {
        data: [createMockAppeal()],
        isLoading: false,
        error: null,
        canSubmit: false,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /appeals/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit appeal/i })).not.toBeInTheDocument();
    });

    it('should render appeals section when user has pending appeals', () => {
      mockValues.useMyAppeals = {
        data: [createMockAppeal()],
        isLoading: false,
        error: null,
        canSubmit: false,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /appeals/i })).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should show cooldown message when user cannot submit appeal', () => {
      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: false,
        cooldownEndsAt: '2025-02-15T10:00:00Z',
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('heading', { name: /appeals/i })).toBeInTheDocument();
      expect(screen.getByText(/cooldown/i)).toBeInTheDocument();
    });

    it('should open appeal modal when Submit Appeal button is clicked', async () => {
      const user = userEvent.setup();

      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: true,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      const submitButton = screen.getByRole('button', { name: /submit appeal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /submit appeal/i })).toBeInTheDocument();
      });
    });

    it('should close appeal modal when cancel is clicked', async () => {
      const user = userEvent.setup();

      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: true,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /submit appeal/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should submit appeal when form is filled and submitted', async () => {
      const user = userEvent.setup();
      const { rankingService } = await import('../../../services/rankingService');
      const refetchMock = vi.fn();

      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: true,
        cooldownEndsAt: null,
        refetch: refetchMock,
      };

      renderWithRouter(<RankingDashboard />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /submit appeal/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill in the reason
      const textarea = screen.getByTestId('appeal-reason-textarea');
      await user.type(textarea, 'I believe this decision was incorrect because...');

      // Submit the appeal
      const submitButton = screen.getByTestId('submit-appeal-confirm-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(rankingService.submitAppeal).toHaveBeenCalledWith(
          'I believe this decision was incorrect because...',
        );
      });
    });

    it('should disable submit button when appeal reason is empty', async () => {
      const user = userEvent.setup();

      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: true,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      // Open modal
      await user.click(screen.getByRole('button', { name: /submit appeal/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Submit button should be disabled when reason is empty
      const submitButton = screen.getByTestId('submit-appeal-confirm-button');
      expect(submitButton).toBeDisabled();
    });

    it('should show empty state message when no appeals and can submit', () => {
      mockValues.useMyAppeals = {
        data: [],
        isLoading: false,
        error: null,
        canSubmit: true,
        cooldownEndsAt: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText(/no appeals submitted yet/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error message when ranking data fails to load', () => {
      mockValues.useMyRanking = {
        data: null,
        isLoading: false,
        error: 'Failed to load ranking data',
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText(/failed to load ranking data/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      mockValues.useMyRanking = {
        data: null,
        isLoading: false,
        error: 'Failed to load ranking data',
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle user with no ranking data gracefully', () => {
      mockValues.useMyRanking = {
        data: createMockRank({
          compositeScore: 0,
          tierLevel: 'NEWCOMER',
          progressToNextTier: 0,
          badges: [],
        }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };

      renderWithRouter(<RankingDashboard />);

      expect(screen.getByText('Newcomer')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes on main container', () => {
      const { container } = renderWithRouter(<RankingDashboard />);

      expect(container.innerHTML).toMatch(/dark:/);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithRouter(<RankingDashboard />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it('should have accessible buttons with proper labels', () => {
      renderWithRouter(<RankingDashboard />);

      const addCredentialButton = screen.getByRole('button', { name: /add credential/i });
      expect(addCredentialButton).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      renderWithRouter(<RankingDashboard />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should render with responsive grid classes', () => {
      const { container } = renderWithRouter(<RankingDashboard />);

      // Check for responsive Tailwind classes
      expect(container.innerHTML).toMatch(/sm:|md:|lg:/);
    });
  });
});
