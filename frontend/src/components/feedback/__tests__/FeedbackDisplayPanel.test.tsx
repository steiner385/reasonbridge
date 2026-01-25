import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackDisplayPanel from '../FeedbackDisplayPanel';
import type { Feedback } from '../../../types/feedback';

describe('FeedbackDisplayPanel', () => {
  const mockFeedbackAffirmation: Feedback = {
    id: '1',
    responseId: 'response-1',
    type: 'AFFIRMATION',
    suggestionText: 'Great use of evidence',
    reasoning: 'Your argument is well-supported',
    confidenceScore: 0.92,
    displayedToUser: true,
    createdAt: new Date('2024-01-01'),
  };

  const mockFeedbackFallacy: Feedback = {
    id: '2',
    responseId: 'response-2',
    type: 'FALLACY',
    subtype: 'ad_hominem',
    suggestionText: 'Avoid personal attacks',
    reasoning: 'Focus on the argument, not the person',
    confidenceScore: 0.88,
    displayedToUser: true,
    createdAt: new Date('2024-01-02'),
  };

  const mockFeedbackInflammatory: Feedback = {
    id: '3',
    responseId: 'response-3',
    type: 'INFLAMMATORY',
    suggestionText: 'Consider more neutral language',
    reasoning: 'Inflammatory language can derail discussions',
    confidenceScore: 0.75,
    displayedToUser: true,
    createdAt: new Date('2024-01-03'),
  };

  const mockFeedbackUnsourced: Feedback = {
    id: '4',
    responseId: 'response-4',
    type: 'UNSOURCED',
    suggestionText: 'Add sources to support your claim',
    reasoning: 'Citations strengthen arguments',
    confidenceScore: 0.81,
    displayedToUser: true,
    createdAt: new Date('2024-01-04'),
  };

  const mockFeedbackBias: Feedback = {
    id: '5',
    responseId: 'response-5',
    type: 'BIAS',
    suggestionText: 'Consider alternative perspectives',
    reasoning: 'Acknowledge different viewpoints',
    confidenceScore: 0.79,
    displayedToUser: true,
    createdAt: new Date('2024-01-05'),
  };

  const mockFeedbackWithResources: Feedback = {
    id: '6',
    responseId: 'response-6',
    type: 'FALLACY',
    suggestionText: 'Learn about logical fallacies',
    reasoning: 'Understanding fallacies improves arguments',
    confidenceScore: 0.85,
    displayedToUser: true,
    createdAt: new Date('2024-01-06'),
    educationalResources: {
      article: 'https://example.com/fallacies',
      definition: 'A reasoning error that undermines an argument',
    },
  };

  const mockFeedbackDismissed: Feedback = {
    id: '7',
    responseId: 'response-7',
    type: 'BIAS',
    suggestionText: 'This was dismissed',
    reasoning: 'Should not appear',
    confidenceScore: 0.7,
    displayedToUser: true,
    dismissedAt: new Date('2024-01-07'),
    createdAt: new Date('2024-01-07'),
  };

  describe('Feedback Type Styling', () => {
    it('should display affirmation feedback with green styling', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} />);

      const feedbackItem = screen.getByRole('article', { name: /affirmation feedback/i });
      expect(feedbackItem.className).toContain('bg-green-50');
      expect(feedbackItem.className).toContain('border-green-500');
    });

    it('should display fallacy feedback with red styling', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackFallacy]} />);

      const feedbackItem = screen.getByRole('article', { name: /fallacy feedback/i });
      expect(feedbackItem.className).toContain('bg-red-50');
      expect(feedbackItem.className).toContain('border-red-500');
    });

    it('should display inflammatory feedback with orange styling', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackInflammatory]} />);

      const feedbackItem = screen.getByRole('article', { name: /inflammatory feedback/i });
      expect(feedbackItem.className).toContain('bg-orange-50');
      expect(feedbackItem.className).toContain('border-orange-500');
    });

    it('should display unsourced feedback with yellow styling', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackUnsourced]} />);

      const feedbackItem = screen.getByRole('article', { name: /unsourced feedback/i });
      expect(feedbackItem.className).toContain('bg-yellow-50');
      expect(feedbackItem.className).toContain('border-yellow-500');
    });

    it('should display bias feedback with blue styling', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackBias]} />);

      const feedbackItem = screen.getByRole('article', { name: /bias feedback/i });
      expect(feedbackItem.className).toContain('bg-blue-50');
      expect(feedbackItem.className).toContain('border-blue-500');
    });
  });

  describe('Content Display', () => {
    it('should show confidence score as percentage', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} />);

      expect(screen.getByText('92% confident')).toBeInTheDocument();
    });

    it('should display suggestion text and reasoning', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackFallacy]} />);

      expect(screen.getByText('Avoid personal attacks')).toBeInTheDocument();
      expect(screen.getByText('Focus on the argument, not the person')).toBeInTheDocument();
    });

    it('should display subtype when available', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackFallacy]} />);

      expect(screen.getByText('(ad_hominem)')).toBeInTheDocument();
    });

    it('should not display subtype when not available', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} />);

      const article = screen.getByRole('article');
      expect(article.textContent).not.toContain('(');
    });

    it('should show educational resources when available', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackWithResources]} />);

      expect(screen.getByText('Educational Resources:')).toBeInTheDocument();
      expect(screen.getByText(/article:/)).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/example.com\/fallacies/)).toBeInTheDocument();
      expect(screen.getByText(/definition:/)).toBeInTheDocument();
      expect(screen.getByText(/A reasoning error that undermines an argument/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when showEmptyState is true and no feedback', () => {
      render(<FeedbackDisplayPanel feedback={[]} showEmptyState />);

      expect(screen.getByText('No feedback available')).toBeInTheDocument();
    });

    it('should display custom empty state message', () => {
      render(
        <FeedbackDisplayPanel feedback={[]} showEmptyState emptyStateMessage="No issues found" />,
      );

      expect(screen.getByText('No issues found')).toBeInTheDocument();
    });

    it('should not render when no feedback and showEmptyState is false', () => {
      const { container } = render(<FeedbackDisplayPanel feedback={[]} showEmptyState={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display empty state when all feedback is dismissed', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackDismissed]} showEmptyState />);

      expect(screen.getByText('No feedback available')).toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when dismiss button is clicked', async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <FeedbackDisplayPanel
          feedback={[mockFeedbackAffirmation]}
          onDismiss={onDismiss}
          showDismiss
        />,
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss feedback/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('should not show dismiss button when showDismiss is false', () => {
      render(
        <FeedbackDisplayPanel
          feedback={[mockFeedbackAffirmation]}
          onDismiss={vi.fn()}
          showDismiss={false}
        />,
      );

      expect(screen.queryByRole('button', { name: /dismiss feedback/i })).not.toBeInTheDocument();
    });

    it('should not show dismiss button when onDismiss is not provided', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} showDismiss />);

      expect(screen.queryByRole('button', { name: /dismiss feedback/i })).not.toBeInTheDocument();
    });
  });

  describe('Title Display', () => {
    it('should display custom title when provided', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} title="Suggestions" />);

      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });

    it('should display default title when not provided', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} />);

      expect(screen.getByText('AI Feedback')).toBeInTheDocument();
    });

    it('should not display title when title is empty string', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation]} title="" />);

      expect(screen.queryByText('AI Feedback')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('Filtered Display', () => {
    it('should not display dismissed feedback', () => {
      render(<FeedbackDisplayPanel feedback={[mockFeedbackAffirmation, mockFeedbackDismissed]} />);

      expect(screen.getByText('Great use of evidence')).toBeInTheDocument();
      expect(screen.queryByText('This was dismissed')).not.toBeInTheDocument();
    });

    it('should display multiple active feedback items', () => {
      render(
        <FeedbackDisplayPanel
          feedback={[mockFeedbackAffirmation, mockFeedbackFallacy, mockFeedbackBias]}
        />,
      );

      expect(screen.getByText('Great use of evidence')).toBeInTheDocument();
      expect(screen.getByText('Avoid personal attacks')).toBeInTheDocument();
      expect(screen.getByText('Consider alternative perspectives')).toBeInTheDocument();
    });
  });
});
