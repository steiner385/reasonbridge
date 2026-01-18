import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToneIndicator } from '../../../components/feedback/ToneIndicator';
import { Feedback, FeedbackType, HelpfulRating, ToneSubtype } from '../../../types/feedback';

describe('ToneIndicator', () => {
  const mockAcknowledge = jest.fn();
  const mockRateHelpful = jest.fn();

  const baseFeedback: Feedback = {
    id: 'test-feedback-1',
    responseId: 'response-1',
    type: FeedbackType.INFLAMMATORY,
    subtype: ToneSubtype.HOSTILE_TONE,
    suggestionText:
      'I noticed this response might come across as hostile. Have you considered rephrasing?',
    reasoning:
      'The language includes dismissive phrases and strong negations that may escalate tension.',
    confidenceScore: 0.85,
    userAcknowledged: false,
    userRevised: false,
    displayedToUser: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render feedback with high confidence score', () => {
      render(<ToneIndicator feedback={baseFeedback} />);

      expect(screen.getByText(/Tone suggestion/i)).toBeInTheDocument();
      expect(screen.getByText(baseFeedback.suggestionText)).toBeInTheDocument();
      expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
    });

    it('should not render feedback below 0.80 confidence threshold', () => {
      const lowConfidenceFeedback = {
        ...baseFeedback,
        confidenceScore: 0.75,
      };

      const { container } = render(<ToneIndicator feedback={lowConfidenceFeedback} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render positive affirmation feedback', () => {
      const affirmationFeedback: Feedback = {
        ...baseFeedback,
        type: FeedbackType.AFFIRMATION,
        subtype: undefined,
        suggestionText: 'This response demonstrates excellent sourcing and bridging language!',
      };

      render(<ToneIndicator feedback={affirmationFeedback} />);
      expect(screen.getByText(/Quality contribution/i)).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(<ToneIndicator feedback={baseFeedback} compact />);

      const compactElement = container.querySelector('.inline-flex');
      expect(compactElement).toBeInTheDocument();
      expect(screen.getByText(/Tone suggestion/i)).toBeInTheDocument();
    });
  });

  describe('Tone Variants', () => {
    it('should render hostile tone variant correctly', () => {
      render(<ToneIndicator feedback={baseFeedback} />);
      expect(screen.getByText(/Tone suggestion/i)).toBeInTheDocument();
    });

    it('should render personal attack variant correctly', () => {
      const attackFeedback = {
        ...baseFeedback,
        subtype: ToneSubtype.PERSONAL_ATTACK,
      };

      render(<ToneIndicator feedback={attackFeedback} />);
      expect(screen.getByText(/Consider rephrasing/i)).toBeInTheDocument();
    });

    it('should render dismissive variant correctly', () => {
      const dismissiveFeedback = {
        ...baseFeedback,
        subtype: ToneSubtype.DISMISSIVE,
      };

      render(<ToneIndicator feedback={dismissiveFeedback} />);
      expect(screen.getByText(/Consider openness/i)).toBeInTheDocument();
    });

    it('should render sarcastic variant correctly', () => {
      const sarcasticFeedback = {
        ...baseFeedback,
        subtype: ToneSubtype.SARCASTIC,
      };

      render(<ToneIndicator feedback={sarcasticFeedback} />);
      expect(screen.getByText(/Clarity suggestion/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onAcknowledge when acknowledge button is clicked', () => {
      render(<ToneIndicator feedback={baseFeedback} onAcknowledge={mockAcknowledge} />);

      const acknowledgeButton = screen.getByRole('button', { name: /Acknowledge feedback/i });
      fireEvent.click(acknowledgeButton);

      expect(mockAcknowledge).toHaveBeenCalledWith(baseFeedback.id);
    });

    it('should not show acknowledge button if already acknowledged', () => {
      const acknowledgedFeedback = {
        ...baseFeedback,
        userAcknowledged: true,
      };

      render(<ToneIndicator feedback={acknowledgedFeedback} onAcknowledge={mockAcknowledge} />);

      expect(
        screen.queryByRole('button', { name: /Acknowledge feedback/i }),
      ).not.toBeInTheDocument();
    });

    it('should toggle reasoning section when button is clicked', () => {
      render(<ToneIndicator feedback={baseFeedback} />);

      const showReasoningButton = screen.getByRole('button', { name: /Show reasoning/i });
      expect(screen.queryByText(baseFeedback.reasoning)).not.toBeInTheDocument();

      fireEvent.click(showReasoningButton);

      expect(screen.getByText(baseFeedback.reasoning)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hide reasoning/i })).toBeInTheDocument();
    });

    it('should show helpfulness rating after acknowledgment', () => {
      const acknowledgedFeedback = {
        ...baseFeedback,
        userAcknowledged: true,
      };

      render(<ToneIndicator feedback={acknowledgedFeedback} onRateHelpful={mockRateHelpful} />);

      expect(screen.getByText(/Was this helpful?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mark as helpful/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mark as not helpful/i })).toBeInTheDocument();
    });

    it('should call onRateHelpful when rating button is clicked', () => {
      const acknowledgedFeedback = {
        ...baseFeedback,
        userAcknowledged: true,
      };

      render(<ToneIndicator feedback={acknowledgedFeedback} onRateHelpful={mockRateHelpful} />);

      const helpfulButton = screen.getByRole('button', { name: /Mark as helpful/i });
      fireEvent.click(helpfulButton);

      expect(mockRateHelpful).toHaveBeenCalledWith(baseFeedback.id, HelpfulRating.HELPFUL);
    });
  });

  describe('Educational Resources', () => {
    it('should show educational resources link when available', () => {
      const feedbackWithResources = {
        ...baseFeedback,
        educationalResources: { link: 'https://example.com/communication-guide' },
      };

      render(<ToneIndicator feedback={feedbackWithResources} />);

      // Expand reasoning section
      const showReasoningButton = screen.getByRole('button', { name: /Show reasoning/i });
      fireEvent.click(showReasoningButton);

      expect(screen.getByText(/Learn more:/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Educational resources/i })).toBeInTheDocument();
    });

    it('should show confidence score in expanded view', () => {
      render(<ToneIndicator feedback={baseFeedback} />);

      // Expand reasoning section
      const showReasoningButton = screen.getByRole('button', { name: /Show reasoning/i });
      fireEvent.click(showReasoningButton);

      expect(screen.getByText(/Confidence: 85%/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ToneIndicator feedback={baseFeedback} />);

      expect(screen.getByRole('article', { name: /AI feedback/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation in compact mode', () => {
      render(<ToneIndicator feedback={baseFeedback} compact />);

      const compactButton = screen.getByRole('button');
      expect(compactButton).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-expanded attribute on reasoning toggle', () => {
      render(<ToneIndicator feedback={baseFeedback} />);

      const toggleButton = screen.getByRole('button', { name: /Show reasoning/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
