/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ActivityFeedItem component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ActivityFeedItem } from '../ActivityFeedItem';
import type { ActivityEvent } from '../../../types/activity';

// Test wrapper with router
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const createMockActivity = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: 'activity-1',
  activityType: 'TOPIC_CREATED',
  targetId: 'topic-1',
  targetType: 'TOPIC',
  targetTitle: 'Test Topic',
  targetSlug: 'test-topic',
  createdAt: '2025-01-01T12:00:00Z',
  user: {
    id: 'user-1',
    displayName: 'John Doe',
    avatarUrl: null,
  },
  ...overrides,
});

describe('ActivityFeedItem', () => {
  beforeEach(() => {
    // Mock Date.now for consistent relative time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render activity item container', () => {
      const activity = createMockActivity();

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('activity-feed-item')).toBeInTheDocument();
    });

    it('should display user name', () => {
      const activity = createMockActivity({
        user: { id: 'user-1', displayName: 'Alice Johnson', avatarUrl: null },
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('should display "Anonymous User" when displayName is null', () => {
      const activity = createMockActivity({
        user: { id: 'user-1', displayName: '', avatarUrl: null },
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('Anonymous User')).toBeInTheDocument();
    });

    it('should display target title', () => {
      const activity = createMockActivity({ targetTitle: 'My Amazing Topic' });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('My Amazing Topic')).toBeInTheDocument();
    });

    it('should display "Untitled" when targetTitle is null', () => {
      const activity = createMockActivity({ targetTitle: null });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });
  });

  describe('Activity Type Descriptions', () => {
    it('should show "created a new topic" for TOPIC_CREATED', () => {
      const activity = createMockActivity({ activityType: 'TOPIC_CREATED' });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('created a new topic')).toBeInTheDocument();
    });

    it('should show "posted a response" for RESPONSE_POSTED', () => {
      const activity = createMockActivity({ activityType: 'RESPONSE_POSTED' });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('posted a response')).toBeInTheDocument();
    });
  });

  describe('Links', () => {
    it('should link user name to user profile', () => {
      const activity = createMockActivity({
        user: { id: 'user-123', displayName: 'Test User', avatarUrl: null },
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      const userLink = screen.getByTestId('activity-user-link');
      expect(userLink).toHaveAttribute('href', '/profile/user-123');
    });

    it('should link target to discussion with topic for TOPIC target', () => {
      const activity = createMockActivity({
        targetType: 'TOPIC',
        targetId: 'topic-456',
        targetSlug: 'my-topic',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      const targetLink = screen.getByTestId('activity-target-link');
      expect(targetLink).toHaveAttribute('href', '/discussions?topic=topic-456');
    });

    it('should link target to discussion for RESPONSE target', () => {
      const activity = createMockActivity({
        targetType: 'RESPONSE',
        targetId: 'response-789',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      const targetLink = screen.getByTestId('activity-target-link');
      expect(targetLink).toHaveAttribute('href', '/discussions?topic=response-789');
    });
  });

  describe('Relative Time Formatting', () => {
    it('should show "just now" for very recent activity', () => {
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:29:30Z', // 30 seconds ago
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('should show minutes for activity less than an hour ago', () => {
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:00:00Z', // 30 minutes ago
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
    });

    it('should show singular minute', () => {
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:29:00Z', // 1 minute ago
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('1 minute ago')).toBeInTheDocument();
    });

    it('should show hours for activity less than a day ago', () => {
      // Set time to 5 hours after activity
      vi.setSystemTime(new Date('2025-01-01T17:00:00Z'));
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:00:00Z',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('5 hours ago')).toBeInTheDocument();
    });

    it('should show singular hour', () => {
      vi.setSystemTime(new Date('2025-01-01T13:00:00Z'));
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:00:00Z',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });

    it('should show days for activity less than a week ago', () => {
      vi.setSystemTime(new Date('2025-01-04T12:00:00Z'));
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:00:00Z',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('3 days ago')).toBeInTheDocument();
    });

    it('should show singular day', () => {
      vi.setSystemTime(new Date('2025-01-02T12:00:00Z'));
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:00:00Z',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      expect(screen.getByText('1 day ago')).toBeInTheDocument();
    });

    it('should show date for activity more than a week ago', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      const activity = createMockActivity({
        createdAt: '2025-01-01T12:00:00Z',
      });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      // Should show localized date format
      expect(screen.getByText(/1\/1\/2025|01\/01\/2025/)).toBeInTheDocument();
    });
  });

  describe('Activity Icons', () => {
    it('should render icon for TOPIC_CREATED', () => {
      const activity = createMockActivity({ activityType: 'TOPIC_CREATED' });

      const { container } = render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      // Should have a blue plus icon
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-blue-500');
    });

    it('should render icon for RESPONSE_POSTED', () => {
      const activity = createMockActivity({ activityType: 'RESPONSE_POSTED' });

      const { container } = render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      // Should have a green chat icon
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-green-500');
    });
  });

  describe('Target Title Accessibility', () => {
    it('should have title attribute for long target titles', () => {
      const longTitle = 'A very long topic title that might get truncated in the UI';
      const activity = createMockActivity({ targetTitle: longTitle });

      render(
        <TestWrapper>
          <ActivityFeedItem activity={activity} />
        </TestWrapper>,
      );

      const targetLink = screen.getByTestId('activity-target-link');
      expect(targetLink).toHaveAttribute('title', longTitle);
    });
  });
});
