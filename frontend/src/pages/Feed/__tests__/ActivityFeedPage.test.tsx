/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ActivityFeedPage from '../ActivityFeedPage';
import { activityFeedService } from '../../../services/activityFeedService';

// Mock the activity feed service
vi.mock('../../../services/activityFeedService', () => ({
  activityFeedService: {
    getFeed: vi.fn(),
  },
}));

const mockGetFeed = vi.mocked(activityFeedService.getFeed);

const mockActivities = [
  {
    id: 'activity-1',
    activityType: 'RESPONSE_CREATED',
    targetId: 'topic-1',
    targetType: 'topic',
    targetTitle: 'Climate Change Discussion',
    targetSlug: 'climate-change-discussion',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    user: {
      id: 'user-1',
      displayName: 'John Doe',
    },
  },
  {
    id: 'activity-2',
    activityType: 'TOPIC_CREATED',
    targetId: 'topic-2',
    targetType: 'topic',
    targetTitle: 'AI Ethics Forum',
    targetSlug: 'ai-ethics-forum',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    user: {
      id: 'user-2',
      displayName: 'Jane Smith',
    },
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ActivityFeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching', async () => {
      mockGetFeed.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ activities: [], nextCursor: null, hasMore: false }), 100),
          ),
      );

      renderWithRouter(<ActivityFeedPage />);

      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Activity Feed' })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no activities', async () => {
      mockGetFeed.mockResolvedValue({
        activities: [],
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
      });

      expect(screen.getByText(/Follow other users to see their activity here/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Explore Topics' })).toHaveAttribute(
        'href',
        '/topics',
      );
    });
  });

  describe('with activities', () => {
    it('renders activity cards', async () => {
      mockGetFeed.mockResolvedValue({
        activities: mockActivities,
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Climate Change Discussion')).toBeInTheDocument();
      expect(screen.getByText('AI Ethics Forum')).toBeInTheDocument();
    });

    it('shows response created activity correctly', async () => {
      mockGetFeed.mockResolvedValue({
        activities: [mockActivities[0]],
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('responded in')).toBeInTheDocument();
      });
    });

    it('shows topic created activity correctly', async () => {
      mockGetFeed.mockResolvedValue({
        activities: [mockActivities[1]],
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('created a new topic')).toBeInTheDocument();
      });
    });

    it('links to user profile', async () => {
      mockGetFeed.mockResolvedValue({
        activities: [mockActivities[0]],
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        const userLink = screen.getByRole('link', { name: 'John Doe' });
        expect(userLink).toHaveAttribute('href', '/profile/user-1');
      });
    });

    it('links to discussion', async () => {
      mockGetFeed.mockResolvedValue({
        activities: [mockActivities[0]],
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        const topicLink = screen.getByRole('link', { name: 'Climate Change Discussion' });
        expect(topicLink).toHaveAttribute('href', '/discussions?topic=topic-1');
      });
    });
  });

  describe('pagination', () => {
    it('shows load more button when hasMore is true', async () => {
      mockGetFeed.mockResolvedValue({
        activities: mockActivities,
        nextCursor: 'cursor-123',
        hasMore: true,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
      });
    });

    it('does not show load more button when hasMore is false', async () => {
      mockGetFeed.mockResolvedValue({
        activities: mockActivities,
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
    });

    it('loads more activities when button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      const moreActivities = [
        {
          id: 'activity-3',
          activityType: 'RESPONSE_CREATED',
          targetId: 'topic-3',
          targetType: 'topic',
          targetTitle: 'Another Topic',
          targetSlug: 'another-topic',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          user: { id: 'user-3', displayName: 'Bob Wilson' },
        },
      ];

      mockGetFeed
        .mockResolvedValueOnce({
          activities: mockActivities,
          nextCursor: 'cursor-123',
          hasMore: true,
        })
        .mockResolvedValueOnce({
          activities: moreActivities,
          nextCursor: null,
          hasMore: false,
        });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Load More' }));

      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });

      expect(mockGetFeed).toHaveBeenCalledWith({ limit: 20, cursor: 'cursor-123' });
    });
  });

  describe('error handling', () => {
    it('shows error message when fetch fails', async () => {
      mockGetFeed.mockRejectedValue(new Error('Failed to load activity feed'));

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
      });

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('retries fetch when try again is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      mockGetFeed.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        activities: mockActivities,
        nextCursor: null,
        hasMore: false,
      });

      renderWithRouter(<ActivityFeedPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try again'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });
});
