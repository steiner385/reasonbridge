/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for DuplicateTopicWarning component
 * Feature 016: Topic Management - T233
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicateTopicWarning } from '../DuplicateTopicWarning';
import type { DuplicateSuggestion } from '../../../services/topicService';

const mockDuplicates: DuplicateSuggestion[] = [
  {
    id: '1',
    title: 'Climate Change Policy Discussion',
    description: 'A discussion about climate change policies and their global impact.',
    similarityScore: 0.92,
    matchType: 'semantic',
  },
  {
    id: '2',
    title: 'Environmental Policy Debate',
    description: 'Debating various environmental policies for sustainable future.',
    similarityScore: 0.78,
    matchType: 'trigram',
  },
  {
    id: '3',
    title: 'Carbon Tax Implementation',
    description: 'Discussion on implementing carbon taxes effectively.',
    similarityScore: 0.65,
    matchType: 'trigram',
  },
];

describe('DuplicateTopicWarning', () => {
  describe('Rendering', () => {
    it('should render the component when duplicates exist', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByTestId('duplicate-topic-warning')).toBeInTheDocument();
    });

    it('should not render when duplicates array is empty', () => {
      render(<DuplicateTopicWarning duplicates={[]} />);
      expect(screen.queryByTestId('duplicate-topic-warning')).not.toBeInTheDocument();
    });

    it('should render header text', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText('Similar Topics Found')).toBeInTheDocument();
    });

    it('should render count message for single duplicate', () => {
      render(<DuplicateTopicWarning duplicates={[mockDuplicates[0]]} />);
      expect(screen.getByText(/We found 1 similar topic\./)).toBeInTheDocument();
    });

    it('should render count message for multiple duplicates', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText(/We found 3 similar topics\./)).toBeInTheDocument();
    });
  });

  describe('Duplicate List', () => {
    it('should render all duplicates up to maxDisplay', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} maxDisplay={3} />);
      const list = screen.getByTestId('duplicate-list');
      expect(list.children).toHaveLength(3);
    });

    it('should limit displayed duplicates to maxDisplay', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} maxDisplay={2} />);
      const list = screen.getByTestId('duplicate-list');
      expect(list.children).toHaveLength(2);
    });

    it('should show remaining count when more duplicates than maxDisplay', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} maxDisplay={1} />);
      expect(screen.getByText(/And 2 more similar topics\.\.\./)).toBeInTheDocument();
    });

    it('should render duplicate titles', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText('Climate Change Policy Discussion')).toBeInTheDocument();
      expect(screen.getByText('Environmental Policy Debate')).toBeInTheDocument();
      expect(screen.getByText('Carbon Tax Implementation')).toBeInTheDocument();
    });

    it('should render duplicate descriptions', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText(/A discussion about climate change policies/)).toBeInTheDocument();
    });

    it('should hide descriptions in compact mode', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} compact />);
      expect(
        screen.queryByText(/A discussion about climate change policies/),
      ).not.toBeInTheDocument();
    });
  });

  describe('Similarity Scores', () => {
    it('should render similarity scores', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText('92% match')).toBeInTheDocument();
      expect(screen.getByText('78% match')).toBeInTheDocument();
      expect(screen.getByText('65% match')).toBeInTheDocument();
    });

    it('should round similarity scores', () => {
      const duplicatesWithDecimals: DuplicateSuggestion[] = [
        {
          id: '1',
          title: 'Test Topic',
          description: 'Test description',
          similarityScore: 0.8567,
          matchType: 'trigram',
        },
      ];
      render(<DuplicateTopicWarning duplicates={duplicatesWithDecimals} />);
      expect(screen.getByText('86% match')).toBeInTheDocument();
    });
  });

  describe('Match Types', () => {
    it('should show match type badges', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText('Similar content')).toBeInTheDocument();
      expect(screen.getAllByText('Similar title')).toHaveLength(2);
    });

    it('should show exact match badge', () => {
      const exactMatch: DuplicateSuggestion[] = [
        {
          id: '1',
          title: 'Exact Title',
          description: 'Exact description',
          similarityScore: 0.99,
          matchType: 'exact',
        },
      ];
      render(<DuplicateTopicWarning duplicates={exactMatch} />);
      expect(screen.getByText('Exact match')).toBeInTheDocument();
    });

    it('should hide match type badges in compact mode', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} compact />);
      expect(screen.queryByText('Similar content')).not.toBeInTheDocument();
    });
  });

  describe('Override Text', () => {
    it('should render default override text', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByText(/click "Create Anyway" to proceed/)).toBeInTheDocument();
    });

    it('should render custom override text', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} overrideText="Submit Topic" />);
      expect(screen.getByText(/click "Submit Topic" to proceed/)).toBeInTheDocument();
    });
  });

  describe('View Topic Callback', () => {
    it('should call onViewTopic when duplicate title is clicked', async () => {
      const user = userEvent.setup();
      const onViewTopic = vi.fn();

      render(<DuplicateTopicWarning duplicates={mockDuplicates} onViewTopic={onViewTopic} />);

      await user.click(screen.getByText('Climate Change Policy Discussion'));
      expect(onViewTopic).toHaveBeenCalledWith('1');
    });

    it('should not render clickable titles when onViewTopic is not provided', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);

      // Titles should be rendered as h5, not buttons
      const title = screen.getByText('Climate Change Policy Discussion');
      expect(title.tagName).toBe('H5');
    });

    it('should render clickable titles when onViewTopic is provided', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} onViewTopic={() => {}} />);

      // Titles should be rendered as buttons
      const title = screen.getByText('Climate Change Policy Discussion');
      expect(title.closest('button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live attribute', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(
        <DuplicateTopicWarning duplicates={mockDuplicates} className="custom-warning-class" />,
      );
      expect(screen.getByTestId('duplicate-topic-warning').className).toContain(
        'custom-warning-class',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle single duplicate correctly', () => {
      render(<DuplicateTopicWarning duplicates={[mockDuplicates[0]]} />);
      expect(screen.getByText(/We found 1 similar topic\./)).toBeInTheDocument();
      expect(screen.queryByText(/And .* more/)).not.toBeInTheDocument();
    });

    it('should handle maxDisplay of 0', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} maxDisplay={0} />);
      const list = screen.getByTestId('duplicate-list');
      expect(list.children).toHaveLength(0);
    });

    it('should handle maxDisplay greater than duplicates length', () => {
      render(<DuplicateTopicWarning duplicates={mockDuplicates} maxDisplay={10} />);
      const list = screen.getByTestId('duplicate-list');
      expect(list.children).toHaveLength(3);
      expect(screen.queryByText(/And .* more/)).not.toBeInTheDocument();
    });
  });
});
