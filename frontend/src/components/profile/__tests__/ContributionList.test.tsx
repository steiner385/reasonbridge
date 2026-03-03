/**
 * Unit tests for ContributionList component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import _userEvent from '@testing-library/user-event';
import { ContributionList } from '../ContributionList';
import type { ContributionItem as ContributionItemType } from '../../../types/contribution';

// Mock ContributionItem component
vi.mock('../ContributionItem', () => ({
  ContributionItem: ({ contribution }: { contribution: ContributionItemType }) => (
    <div data-testid={`contribution-${contribution.id}`} data-type={contribution.type}>
      {contribution.title}
    </div>
  ),
}));

// Mock IntersectionObserver properly
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  callback: (entries: { isIntersecting: boolean }[]) => void;

  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    this.callback = callback;
  }

  observe = mockObserve;
  unobserve = mockUnobserve;
  disconnect = mockDisconnect;
}

window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('ContributionList', () => {
  const mockContributions: ContributionItemType[] = [
    {
      id: 'contrib-1',
      type: 'TOPIC',
      title: 'First Topic',
      createdAt: '2024-01-15T00:00:00Z',
      entityId: 'topic-1',
    },
    {
      id: 'contrib-2',
      type: 'RESPONSE',
      title: 'First Response',
      createdAt: '2024-02-10T00:00:00Z',
      entityId: 'response-1',
    },
    {
      id: 'contrib-3',
      type: 'VOTE',
      title: 'Vote on Response',
      createdAt: '2024-02-20T00:00:00Z',
      entityId: 'vote-1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render list of contributions', () => {
      render(<ContributionList contributions={mockContributions} />);

      expect(screen.getByTestId('contribution-contrib-1')).toBeInTheDocument();
      expect(screen.getByTestId('contribution-contrib-2')).toBeInTheDocument();
      expect(screen.getByTestId('contribution-contrib-3')).toBeInTheDocument();
    });

    it('should render contribution titles', () => {
      render(<ContributionList contributions={mockContributions} />);

      expect(screen.getByText('First Topic')).toBeInTheDocument();
      expect(screen.getByText('First Response')).toBeInTheDocument();
      expect(screen.getByText('Vote on Response')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ContributionList contributions={mockContributions} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no contributions', () => {
      render(<ContributionList contributions={[]} isOwnProfile={false} />);
      expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
      expect(screen.getByText(/hasn't contributed to any discussions/i)).toBeInTheDocument();
    });

    it('should show own profile empty state message', () => {
      render(<ContributionList contributions={[]} isOwnProfile={true} />);
      expect(screen.getByText(/Start contributing by creating topics/i)).toBeInTheDocument();
    });

    it('should show filter-specific empty state for TOPIC filter', () => {
      render(<ContributionList contributions={[]} selectedType="TOPIC" isOwnProfile={false} />);
      expect(screen.getByText('No Topics')).toBeInTheDocument();
    });

    it('should show filter-specific empty state for RESPONSE filter', () => {
      render(<ContributionList contributions={[]} selectedType="RESPONSE" isOwnProfile={false} />);
      expect(screen.getByText('No Responses')).toBeInTheDocument();
    });

    it('should show filter-specific empty state for VOTE filter', () => {
      render(<ContributionList contributions={[]} selectedType="VOTE" isOwnProfile={false} />);
      expect(screen.getByText('No Votes')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<ContributionList contributions={[]} isLoading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show loading spinner with existing contributions', () => {
      render(<ContributionList contributions={mockContributions} isLoading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      // Should still show existing contributions
      expect(screen.getByTestId('contribution-contrib-1')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when isError is true', () => {
      render(<ContributionList contributions={[]} isError={true} />);
      expect(screen.getByText(/failed to load contributions/i)).toBeInTheDocument();
    });

    it('should show custom error message', () => {
      render(
        <ContributionList
          contributions={[]}
          isError={true}
          errorMessage="Network connection lost"
        />,
      );
      expect(screen.getByText('Network connection lost')).toBeInTheDocument();
    });
  });

  describe('Infinite Scroll', () => {
    it('should call observe when hasMore is true', () => {
      const onLoadMore = vi.fn();
      render(
        <ContributionList
          contributions={mockContributions}
          hasMore={true}
          onLoadMore={onLoadMore}
        />,
      );

      expect(mockObserve).toHaveBeenCalled();
    });

    it('should not call observe when hasMore is false', () => {
      mockObserve.mockClear();
      render(<ContributionList contributions={mockContributions} hasMore={false} />);

      // Observer should not be set up when there's no more to load
      expect(mockObserve).not.toHaveBeenCalled();
    });

    it('should disconnect observer on unmount', () => {
      const onLoadMore = vi.fn();
      const { unmount } = render(
        <ContributionList
          contributions={mockContributions}
          hasMore={true}
          onLoadMore={onLoadMore}
        />,
      );

      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('Load More', () => {
    it('should render sentinel element when hasMore is true', () => {
      const onLoadMore = vi.fn();
      render(
        <ContributionList
          contributions={mockContributions}
          hasMore={true}
          onLoadMore={onLoadMore}
        />,
      );

      // The component uses IntersectionObserver sentinel, not a button
      // Verify contributions are rendered and observer is set up
      expect(screen.getByTestId('contribution-contrib-1')).toBeInTheDocument();
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  describe('Contribution Types', () => {
    it('should pass correct type to ContributionItem', () => {
      render(<ContributionList contributions={mockContributions} />);

      expect(screen.getByTestId('contribution-contrib-1')).toHaveAttribute('data-type', 'TOPIC');
      expect(screen.getByTestId('contribution-contrib-2')).toHaveAttribute('data-type', 'RESPONSE');
      expect(screen.getByTestId('contribution-contrib-3')).toHaveAttribute('data-type', 'VOTE');
    });
  });

  describe('List Structure', () => {
    it('should render contributions in order', () => {
      render(<ContributionList contributions={mockContributions} />);

      const contributions = screen.getAllByTestId(/contribution-/);
      expect(contributions[0]).toHaveAttribute('data-testid', 'contribution-contrib-1');
      expect(contributions[1]).toHaveAttribute('data-testid', 'contribution-contrib-2');
      expect(contributions[2]).toHaveAttribute('data-testid', 'contribution-contrib-3');
    });

    it('should handle single contribution', () => {
      render(<ContributionList contributions={[mockContributions[0]]} />);

      expect(screen.getByTestId('contribution-contrib-1')).toBeInTheDocument();
      expect(screen.queryByTestId('contribution-contrib-2')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle contributions with long titles', () => {
      const longTitleContribution: ContributionItemType[] = [
        {
          id: 'long-1',
          type: 'TOPIC',
          title: 'A'.repeat(200),
          createdAt: '2024-01-15T00:00:00Z',
          entityId: 'topic-long',
        },
      ];

      render(<ContributionList contributions={longTitleContribution} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle mixed loading and error states gracefully', () => {
      render(
        <ContributionList
          contributions={mockContributions}
          isLoading={true}
          isError={true}
          errorMessage="Error occurred"
        />,
      );

      // Error takes precedence
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper container structure', () => {
      const { container } = render(<ContributionList contributions={mockContributions} />);

      // Uses div with space-y-4 for list layout
      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
    });

    it('should have accessible loading indicator', () => {
      render(<ContributionList contributions={mockContributions} isLoading={true} />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });
});
