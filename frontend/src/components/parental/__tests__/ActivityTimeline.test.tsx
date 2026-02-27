/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline, ActivityItem } from '../ActivityTimeline';

describe('ActivityTimeline', () => {
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'RESPONSE_POSTED',
      description: 'Posted a response in "Climate Change Discussion"',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    },
    {
      id: '2',
      type: 'TOPIC_JOINED',
      description: 'Joined the topic "Science and Technology"',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: '3',
      type: 'VOTE_CAST',
      description: 'Voted on a response',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
  ];

  describe('Rendering', () => {
    it('should render timeline with activities', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      expect(screen.getByTestId('activity-timeline')).toBeInTheDocument();
      expect(
        screen.getByText('Posted a response in "Climate Change Discussion"'),
      ).toBeInTheDocument();
      expect(screen.getByText('Joined the topic "Science and Technology"')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<ActivityTimeline activities={[]} isLoading={true} />);

      expect(screen.getByTestId('activity-timeline-loading')).toBeInTheDocument();
    });

    it('should render empty state when no activities', () => {
      render(<ActivityTimeline activities={[]} />);

      expect(screen.getByTestId('activity-timeline-empty')).toBeInTheDocument();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(<ActivityTimeline activities={[]} emptyMessage="Nothing to show" />);

      expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    });
  });

  describe('Timestamps', () => {
    it('should display relative time for recent activities', () => {
      const recentActivity: ActivityItem[] = [
        {
          id: '1',
          type: 'LOGIN',
          description: 'Logged in',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
        },
      ];

      render(<ActivityTimeline activities={recentActivity} />);

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('should display hours for activities within 24 hours', () => {
      const hourAgoActivity: ActivityItem[] = [
        {
          id: '1',
          type: 'LOGIN',
          description: 'Logged in',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        },
      ];

      render(<ActivityTimeline activities={hourAgoActivity} />);

      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('should display days for activities within a week', () => {
      const daysAgoActivity: ActivityItem[] = [
        {
          id: '1',
          type: 'LOGIN',
          description: 'Logged in',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        },
      ];

      render(<ActivityTimeline activities={daysAgoActivity} />);

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });

  describe('Limiting items', () => {
    it('should respect maxItems prop', () => {
      const manyActivities: ActivityItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        type: 'LOGIN' as const,
        description: `Activity ${i}`,
        timestamp: new Date().toISOString(),
      }));

      render(<ActivityTimeline activities={manyActivities} maxItems={5} />);

      // Should only show 5 items
      expect(screen.getByText('Activity 0')).toBeInTheDocument();
      expect(screen.getByText('Activity 4')).toBeInTheDocument();
      expect(screen.queryByText('Activity 5')).not.toBeInTheDocument();

      // Should show "more" indicator
      expect(screen.getByText('+ 10 more activities')).toBeInTheDocument();
    });

    it('should not show more indicator if activities <= maxItems', () => {
      render(<ActivityTimeline activities={mockActivities} maxItems={10} />);

      expect(screen.queryByText(/more activities/)).not.toBeInTheDocument();
    });
  });

  describe('Activity types', () => {
    const allActivityTypes: ActivityItem[] = [
      {
        id: '1',
        type: 'RESPONSE_POSTED',
        description: 'Response posted',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'TOPIC_JOINED',
        description: 'Topic joined',
        timestamp: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'TOPIC_CREATED',
        description: 'Topic created',
        timestamp: new Date().toISOString(),
      },
      { id: '4', type: 'VOTE_CAST', description: 'Vote cast', timestamp: new Date().toISOString() },
      {
        id: '5',
        type: 'RESPONSE_EDITED',
        description: 'Response edited',
        timestamp: new Date().toISOString(),
      },
      {
        id: '6',
        type: 'PROFILE_UPDATED',
        description: 'Profile updated',
        timestamp: new Date().toISOString(),
      },
      { id: '7', type: 'LOGIN', description: 'Login', timestamp: new Date().toISOString() },
    ];

    it('should render all activity types', () => {
      render(<ActivityTimeline activities={allActivityTypes} />);

      expect(screen.getByText('Response posted')).toBeInTheDocument();
      expect(screen.getByText('Topic joined')).toBeInTheDocument();
      expect(screen.getByText('Topic created')).toBeInTheDocument();
      expect(screen.getByText('Vote cast')).toBeInTheDocument();
      expect(screen.getByText('Response edited')).toBeInTheDocument();
      expect(screen.getByText('Profile updated')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });
});
