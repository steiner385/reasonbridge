/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ActivityFeedPage component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ActivityFeedPage } from '../ActivityFeedPage';
import { useActivityFeed } from '../../../hooks/useActivityFeed';
import type { ActivityEvent } from '../../../types/activity';

// Mock the useActivityFeed hook
vi.mock('../../../hooks/useActivityFeed');

const mockUseActivityFeed = useActivityFeed as Mock;

// Test wrapper with router
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const mockActivities: ActivityEvent[] = [
  {
    id: 'activity-1',
    activityType: 'TOPIC_CREATED',
    targetId: 'topic-1',
    targetType: 'TOPIC',
    targetTitle: 'Test Topic',
    targetSlug: 'test-topic',
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-1',
      displayName: 'John Doe',
      avatarUrl: null,
    },
  },
  {
    id: 'activity-2',
    activityType: 'RESPONSE_POSTED',
    targetId: 'topic-2',
    targetType: 'RESPONSE',
    targetTitle: 'Another Topic',
    targetSlug: null,
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-2',
      displayName: 'Jane Smith',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
  },
];

describe('ActivityFeedPage', () => {
  const defaultHookReturn = {
    activities: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActivityFeed.mockReturnValue(defaultHookReturn);
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByRole('heading', { name: /activity feed/i })).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByText(/see what the people you follow are up to/i)).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('refresh-feed-button')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading and no activities', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        activities: [],
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('feed-loading')).toBeInTheDocument();
    });

    it('should not show loading spinner when activities exist', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        activities: mockActivities,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('feed-loading')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when there is an error', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        error: 'Failed to load feed',
        isLoading: false,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('feed-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load feed')).toBeInTheDocument();
    });

    it('should have retry button in error state', () => {
      const refresh = vi.fn();
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        error: 'Network error',
        refresh,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText('Try again'));
      expect(refresh).toHaveBeenCalled();
    });

    it('should not show error when loading', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        error: 'Some error',
        isLoading: true,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('feed-error')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no activities', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: [],
        isLoading: false,
        error: null,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('feed-empty')).toBeInTheDocument();
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
      expect(screen.getByText(/follow other users/i)).toBeInTheDocument();
    });

    it('should have link to topics page in empty state', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: [],
        isLoading: false,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      const browseLink = screen.getByTestId('browse-topics-link');
      expect(browseLink).toBeInTheDocument();
      expect(browseLink).toHaveAttribute('href', '/topics');
    });

    it('should not show empty state when loading', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: [],
        isLoading: true,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('feed-empty')).not.toBeInTheDocument();
    });

    it('should not show empty state when there is an error', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: [],
        error: 'Error occurred',
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('feed-empty')).not.toBeInTheDocument();
    });
  });

  describe('Activity List', () => {
    it('should render activity items when activities exist', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('activity-feed-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('activity-feed-item')).toHaveLength(2);
    });

    it('should display user names', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display target titles', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByText('Test Topic')).toBeInTheDocument();
      expect(screen.getByText('Another Topic')).toBeInTheDocument();
    });
  });

  describe('Load More', () => {
    it('should show load more button when hasMore is true', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
        hasMore: true,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
        hasMore: false,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument();
    });

    it('should call loadMore when button is clicked', () => {
      const loadMore = vi.fn();
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
        hasMore: true,
        loadMore,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId('load-more-button'));
      expect(loadMore).toHaveBeenCalled();
    });

    it('should disable load more button when loading more', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
        hasMore: true,
        isLoadingMore: true,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('load-more-button')).toBeDisabled();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('End of Feed', () => {
    it('should show end of feed message when no more items', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: mockActivities,
        hasMore: false,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('end-of-feed')).toBeInTheDocument();
      expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
    });

    it('should not show end of feed when activities list is empty', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        activities: [],
        hasMore: false,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('end-of-feed')).not.toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('should call refresh when refresh button is clicked', () => {
      const refresh = vi.fn();
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        refresh,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId('refresh-feed-button'));
      expect(refresh).toHaveBeenCalled();
    });

    it('should disable refresh button when loading', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('refresh-feed-button')).toBeDisabled();
    });

    it('should show spinning icon when loading', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        activities: mockActivities,
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      const button = screen.getByTestId('refresh-feed-button');
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible refresh button', () => {
      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByTestId('refresh-feed-button')).toHaveAttribute(
        'aria-label',
        'Refresh feed',
      );
    });

    it('should have role=alert on error state', () => {
      mockUseActivityFeed.mockReturnValue({
        ...defaultHookReturn,
        error: 'Error message',
      });

      render(
        <TestWrapper>
          <ActivityFeedPage />
        </TestWrapper>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
