import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuggestionCards from '../SuggestionCards';
import type {
  TagSuggestionsResponse,
  TopicLinkSuggestionsResponse,
} from '../../../types/suggestions';

describe('SuggestionCards', () => {
  const mockTagSuggestions: TagSuggestionsResponse = {
    suggestions: ['politics', 'economics', 'healthcare'],
    confidenceScore: 0.89,
    reasoning: 'The response discusses economic policy and healthcare reform',
    attribution: 'GPT-4 Analysis',
  };

  const mockTopicLinkSuggestions: TopicLinkSuggestionsResponse = {
    suggestions: [],
    linkSuggestions: [
      {
        targetTopicId: 'topic-abc123def456',
        relationshipType: 'supports',
        reasoning: 'Both topics argue for renewable energy investment',
      },
      {
        targetTopicId: 'topic-xyz789ghi012',
        relationshipType: 'contradicts',
        reasoning: 'This topic opposes the economic feasibility claim',
      },
      {
        targetTopicId: 'topic-mno345pqr678',
        relationshipType: 'extends',
        reasoning: 'This topic explores the international implications',
      },
      {
        targetTopicId: 'topic-stu901vwx234',
        relationshipType: 'questions',
        reasoning: 'This topic questions the underlying assumptions',
      },
      {
        targetTopicId: 'topic-abc567def890',
        relationshipType: 'relates_to',
        reasoning: 'This topic is tangentially related',
      },
    ],
    confidenceScore: 0.92,
    reasoning: 'The response touches on multiple established discussions',
    attribution: 'Claude Sonnet',
  };

  describe('Tag Suggestions', () => {
    it('should display tag suggestions with correct styling', () => {
      render(<SuggestionCards type="tags" tagSuggestions={mockTagSuggestions} />);

      expect(screen.getByText('#politics')).toBeInTheDocument();
      expect(screen.getByText('#economics')).toBeInTheDocument();
      expect(screen.getByText('#healthcare')).toBeInTheDocument();
    });

    it('should show confidence score and attribution', () => {
      render(<SuggestionCards type="tags" tagSuggestions={mockTagSuggestions} />);

      expect(screen.getByText(/AI Confidence: 89%/)).toBeInTheDocument();
      expect(screen.getByText('GPT-4 Analysis')).toBeInTheDocument();
    });

    it('should display reasoning for tag suggestions', () => {
      render(<SuggestionCards type="tags" tagSuggestions={mockTagSuggestions} />);

      expect(
        screen.getByText('The response discusses economic policy and healthcare reform'),
      ).toBeInTheDocument();
    });

    it('should show accept button when showActions is true', () => {
      render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          showActions
          onAccept={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /accept tag politics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /accept tag economics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /accept tag healthcare/i })).toBeInTheDocument();
    });

    it('should show dismiss button when showActions is true', () => {
      render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          showActions
          onDismiss={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /dismiss tag politics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss tag economics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss tag healthcare/i })).toBeInTheDocument();
    });

    it('should call onAccept when accept button is clicked', async () => {
      const onAccept = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          showActions
          onAccept={onAccept}
        />,
      );

      await user.click(screen.getByRole('button', { name: /accept tag politics/i }));

      expect(onAccept).toHaveBeenCalledWith('politics');
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          showActions
          onDismiss={onDismiss}
        />,
      );

      await user.click(screen.getByRole('button', { name: /dismiss tag economics/i }));

      expect(onDismiss).toHaveBeenCalledWith('economics');
    });
  });

  describe('Topic Link Suggestions', () => {
    it('should display topic link suggestions with relationship types', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      expect(screen.getByText('SUPPORTS')).toBeInTheDocument();
      expect(screen.getByText('CONTRADICTS')).toBeInTheDocument();
      expect(screen.getByText('EXTENDS')).toBeInTheDocument();
      expect(screen.getByText('QUESTIONS')).toBeInTheDocument();
      expect(screen.getByText(/RELATES TO/)).toBeInTheDocument();
    });

    it('should show correct styling for supports relationship type', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      const supportsBadge = screen.getByText('SUPPORTS').closest('span');
      expect(supportsBadge?.className).toContain('bg-green-100');
      expect(supportsBadge?.className).toContain('text-green-800');
    });

    it('should show correct styling for contradicts relationship type', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      const contradictsBadge = screen.getByText('CONTRADICTS').closest('span');
      expect(contradictsBadge?.className).toContain('bg-red-100');
      expect(contradictsBadge?.className).toContain('text-red-800');
    });

    it('should show correct styling for extends relationship type', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      const extendsBadge = screen.getByText('EXTENDS').closest('span');
      expect(extendsBadge?.className).toContain('bg-blue-100');
      expect(extendsBadge?.className).toContain('text-blue-800');
    });

    it('should show correct styling for questions relationship type', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      const questionsBadge = screen.getByText('QUESTIONS').closest('span');
      expect(questionsBadge?.className).toContain('bg-purple-100');
      expect(questionsBadge?.className).toContain('text-purple-800');
    });

    it('should show correct styling for relates_to relationship type', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      const relatesBadge = screen.getByText(/RELATES TO/).closest('span');
      expect(relatesBadge?.className).toContain('bg-gray-100');
      expect(relatesBadge?.className).toContain('text-gray-800');
    });

    it('should display target topic ID truncated and reasoning', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      // Check that topic IDs are truncated to 8 characters
      const topicIds = screen.getAllByText(/Topic: topic-.../);
      expect(topicIds.length).toBeGreaterThan(0);

      // Check that reasoning is displayed for all links
      expect(
        screen.getByText('Both topics argue for renewable energy investment'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('This topic opposes the economic feasibility claim'),
      ).toBeInTheDocument();
    });

    it('should show overall analysis reasoning', () => {
      render(
        <SuggestionCards type="topic-links" topicLinkSuggestions={mockTopicLinkSuggestions} />,
      );

      expect(screen.getByText('Overall Analysis:')).toBeInTheDocument();
      expect(
        screen.getByText(/The response touches on multiple established discussions/),
      ).toBeInTheDocument();
    });

    it('should call onAccept with TopicLink when accept is clicked', async () => {
      const onAccept = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionCards
          type="topic-links"
          topicLinkSuggestions={mockTopicLinkSuggestions}
          showActions
          onAccept={onAccept}
        />,
      );

      const acceptButtons = screen.getAllByRole('button', {
        name: /accept topic link suggestion/i,
      });
      await user.click(acceptButtons[0]);

      expect(onAccept).toHaveBeenCalledWith(mockTopicLinkSuggestions.linkSuggestions[0]);
    });

    it('should call onDismiss with TopicLink when dismiss is clicked', async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionCards
          type="topic-links"
          topicLinkSuggestions={mockTopicLinkSuggestions}
          showActions
          onDismiss={onDismiss}
        />,
      );

      const dismissButtons = screen.getAllByRole('button', {
        name: /dismiss topic link suggestion/i,
      });
      await user.click(dismissButtons[1]);

      expect(onDismiss).toHaveBeenCalledWith(mockTopicLinkSuggestions.linkSuggestions[1]);
    });
  });

  describe('Empty State', () => {
    it('should display empty state when showEmptyState is true and no tag suggestions', () => {
      const emptyTagSuggestions: TagSuggestionsResponse = {
        suggestions: [],
        confidenceScore: 0.0,
        reasoning: '',
        attribution: '',
      };

      render(<SuggestionCards type="tags" tagSuggestions={emptyTagSuggestions} showEmptyState />);

      expect(screen.getByText('No suggestions available')).toBeInTheDocument();
    });

    it('should not render when no suggestions and showEmptyState is false', () => {
      const emptyTagSuggestions: TagSuggestionsResponse = {
        suggestions: [],
        confidenceScore: 0.0,
        reasoning: '',
        attribution: '',
      };

      const { container } = render(
        <SuggestionCards type="tags" tagSuggestions={emptyTagSuggestions} showEmptyState={false} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display custom empty state message when provided', () => {
      const emptyTopicLinkSuggestions: TopicLinkSuggestionsResponse = {
        suggestions: [],
        linkSuggestions: [],
        confidenceScore: 0.0,
        reasoning: '',
        attribution: '',
      };

      render(
        <SuggestionCards
          type="topic-links"
          topicLinkSuggestions={emptyTopicLinkSuggestions}
          showEmptyState
          emptyStateMessage="No related topics found"
        />,
      );

      expect(screen.getByText('No related topics found')).toBeInTheDocument();
    });
  });

  describe('General', () => {
    it('should display custom title when provided', () => {
      render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          title="Recommended Tags"
        />,
      );

      expect(screen.getByText('Recommended Tags')).toBeInTheDocument();
    });

    it('should apply custom className to container', () => {
      const { container } = render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          className="custom-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should not show actions when showActions is false', () => {
      render(
        <SuggestionCards
          type="tags"
          tagSuggestions={mockTagSuggestions}
          showActions={false}
          onAccept={vi.fn()}
          onDismiss={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /accept tag/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dismiss tag/i })).not.toBeInTheDocument();
    });

    it('should not show actions when showActions is true but callbacks are undefined', () => {
      render(<SuggestionCards type="tags" tagSuggestions={mockTagSuggestions} showActions />);

      expect(screen.queryByRole('button', { name: /accept tag/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dismiss tag/i })).not.toBeInTheDocument();
    });
  });
});
