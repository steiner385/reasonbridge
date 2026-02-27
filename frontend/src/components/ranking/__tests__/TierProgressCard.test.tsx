/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TierProgressCard component
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TierProgressCard from '../TierProgressCard';
import type { UserRank } from '../../../types/ranking';

// Mock user ranks for testing
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

describe('TierProgressCard', () => {
  describe('Current Tier Badge', () => {
    it('should render the TierBadge component with correct tier', () => {
      const rank = createMockRank({ tierLevel: 'TRUSTED' });
      render(<TierProgressCard rank={rank} />);

      // TierBadge renders with role="status"
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'User tier: Trusted');
    });

    it('should render tier name as text heading', () => {
      const rank = createMockRank({ tierLevel: 'LEADER' });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('Leader')).toBeInTheDocument();
    });

    it('should render different tiers correctly', () => {
      const { rerender } = render(
        <TierProgressCard rank={createMockRank({ tierLevel: 'NEWCOMER' })} />,
      );
      expect(screen.getByText('Newcomer')).toBeInTheDocument();

      rerender(<TierProgressCard rank={createMockRank({ tierLevel: 'EXPERT' })} />);
      expect(screen.getByText('Expert')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct percentage', () => {
      const rank = createMockRank({ progressToNextTier: 75 });
      render(<TierProgressCard rank={rank} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should have correct aria attributes on progress bar', () => {
      const rank = createMockRank({ progressToNextTier: 50 });
      render(<TierProgressCard rank={rank} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should display percentage text', () => {
      const rank = createMockRank({ progressToNextTier: 42 });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('should handle 0% progress', () => {
      const rank = createMockRank({ progressToNextTier: 0 });
      render(<TierProgressCard rank={rank} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle 100% progress', () => {
      const rank = createMockRank({ progressToNextTier: 100 });
      render(<TierProgressCard rank={rank} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Composite Score Display', () => {
    it('should display composite score', () => {
      const rank = createMockRank({ compositeScore: 0.45 });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('0.450')).toBeInTheDocument();
    });

    it('should display score label', () => {
      const rank = createMockRank();
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('Score:')).toBeInTheDocument();
    });

    it('should format score to 3 decimal places', () => {
      const rank = createMockRank({ compositeScore: 0.8 });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('0.800')).toBeInTheDocument();
    });
  });

  describe('Score Breakdown', () => {
    it('should display engagement score as percentage', () => {
      const rank = createMockRank({ engagementScore: 0.4 });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Engagement:/)).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('should display quality score as percentage', () => {
      const rank = createMockRank({ qualityScore: 0.5 });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Quality:/)).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display tenure bonus as percentage', () => {
      const rank = createMockRank({ tenureBonus: 0.027 });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Tenure:/)).toBeInTheDocument();
      expect(screen.getByText('2.7%')).toBeInTheDocument();
    });

    it('should display badge count', () => {
      const rank = createMockRank({ badges: ['badge-1', 'badge-2', 'badge-3'] });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Badges:/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display section header', () => {
      const rank = createMockRank();
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('Score Breakdown:')).toBeInTheDocument();
    });
  });

  describe('Next Tier Information', () => {
    it('should show next tier name for non-EXPERT tiers', () => {
      const rank = createMockRank({ tierLevel: 'TRUSTED' });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Progress to/)).toBeInTheDocument();
      expect(screen.getByText(/Leader/)).toBeInTheDocument();
    });

    it('should show CONTRIBUTOR as next tier for NEWCOMER', () => {
      const rank = createMockRank({ tierLevel: 'NEWCOMER' });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Progress to/)).toBeInTheDocument();
      expect(screen.getByText(/Contributor/)).toBeInTheDocument();
    });

    it('should show EXPERT as next tier for LEADER', () => {
      const rank = createMockRank({ tierLevel: 'LEADER' });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText(/Progress to/)).toBeInTheDocument();
      expect(screen.getByText(/Expert/)).toBeInTheDocument();
    });
  });

  describe('EXPERT Tier Special Handling', () => {
    it('should show "Max tier reached" for EXPERT tier', () => {
      const rank = createMockRank({
        tierLevel: 'EXPERT',
        progressToNextTier: 100,
        nextTierThreshold: 1.0,
      });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('Max tier reached')).toBeInTheDocument();
    });

    it('should not show progress bar for EXPERT tier', () => {
      const rank = createMockRank({
        tierLevel: 'EXPERT',
        progressToNextTier: 100,
        nextTierThreshold: 1.0,
      });
      render(<TierProgressCard rank={rank} />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should still show composite score for EXPERT tier', () => {
      const rank = createMockRank({
        tierLevel: 'EXPERT',
        compositeScore: 0.95,
        progressToNextTier: 100,
        nextTierThreshold: 1.0,
      });
      render(<TierProgressCard rank={rank} />);

      expect(screen.getByText('0.950')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Classes', () => {
    it('should include dark mode background classes on container', () => {
      const rank = createMockRank();
      const { container } = render(<TierProgressCard rank={rank} />);

      const card = container.firstChild;
      expect(card).toHaveClass('dark:bg-gray-800');
    });

    it('should include dark mode text classes', () => {
      const rank = createMockRank();
      const { container } = render(<TierProgressCard rank={rank} />);

      // Check that dark mode classes exist somewhere in the rendered output
      expect(container.innerHTML).toMatch(/dark:text-/);
    });

    it('should include dark mode border classes', () => {
      const rank = createMockRank();
      const { container } = render(<TierProgressCard rank={rank} />);

      expect(container.innerHTML).toMatch(/dark:border-/);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible progress bar with label', () => {
      const rank = createMockRank({ progressToNextTier: 50 });
      render(<TierProgressCard rank={rank} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label');
    });

    it('should have semantic heading structure', () => {
      const rank = createMockRank();
      render(<TierProgressCard rank={rank} />);

      // The component should have semantic headings (h3 for tier name, h4 for breakdown)
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(1);
      // Tier name heading should contain the tier name
      expect(headings[0]).toHaveTextContent('Trusted');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const rank = createMockRank();
      const { container } = render(<TierProgressCard rank={rank} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const rank = createMockRank();
      const { container } = render(<TierProgressCard rank={rank} className="my-custom-style" />);

      const card = container.firstChild;
      expect(card).toHaveClass('my-custom-style');
      expect(card).toHaveClass('rounded-xl');
    });
  });
});
