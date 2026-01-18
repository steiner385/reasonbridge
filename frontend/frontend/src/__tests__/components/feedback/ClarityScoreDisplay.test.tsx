import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClarityScoreDisplay } from '../../../components/feedback/ClarityScoreDisplay';
import { Feedback, FeedbackType, ClarityMetrics } from '../../../types/feedback';

describe('ClarityScoreDisplay', () => {
  const mockAcknowledge = jest.fn();

  const unsourcedFeedback: Feedback = {
    id: 'feedback-1',
    responseId: 'response-1',
    type: FeedbackType.UNSOURCED,
    suggestionText: 'Consider providing specific sources for factual claims.',
    reasoning: 'Detected 2 instance(s) of potentially unsourced claims.',
    confidenceScore: 0.85,
    userAcknowledged: false,
    userRevised: false,
    displayedToUser: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const biasFeedback: Feedback = {
    id: 'feedback-2',
    responseId: 'response-1',
    type: FeedbackType.BIAS,
    subtype: 'loaded_language',
    suggestionText: 'Consider using more neutral language to present your argument.',
    reasoning: 'Detected 1 instance(s) of potentially biased framing.',
    confidenceScore: 0.82,
    userAcknowledged: false,
    userRevised: false,
    displayedToUser: true,
    createdAt: new Date('2024-01-15T10:05:00Z'),
  };

  const customMetrics: ClarityMetrics = {
    sourcingScore: 0.75,
    neutralityScore: 0.88,
    specificityScore: 0.92,
    overallClarityScore: 0.85,
    issuesDetected: {
      unsourcedClaims: 2,
      biasIndicators: 1,
      vagueStatements: 0,
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render clarity score with feedback', () => {
      render(
        <ClarityScoreDisplay feedback={[unsourcedFeedback, biasFeedback]} />
      );

      expect(screen.getByText(/Clarity Score/i)).toBeInTheDocument();
      expect(screen.getByText(/AI-powered analysis/i)).toBeInTheDocument();
    });

    it('should calculate and display overall clarity score from feedback', () => {
      render(
        <ClarityScoreDisplay feedback={[unsourcedFeedback]} />
      );

      // Should show a score (calculated from feedback)
      expect(screen.getByRole('region', { name: /Clarity analysis/i })).toBeInTheDocument();
    });

    it('should use provided metrics when available', () => {
      render(
        <ClarityScoreDisplay
          feedback={[unsourcedFeedback, biasFeedback]}
          metrics={customMetrics}
        />
      );

      // Should display the custom overall score
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(
        <ClarityScoreDisplay
          feedback={[unsourcedFeedback]}
          compact
        />
      );

      const compactElement = container.querySelector('.inline-flex');
      expect(compactElement).toBeInTheDocument();
      expect(screen.getByText(/Clarity:/i)).toBeInTheDocument();
    });

    it('should show no issues message when feedback is empty', () => {
      render(<ClarityScoreDisplay feedback={[]} />);

      expect(screen.getByText(/No clarity issues detected/i)).toBeInTheDocument();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate sourcing score based on unsourced feedback', () => {
      render(
        <ClarityScoreDisplay feedback={[unsourcedFeedback]} />
      );

      expect(screen.getByText(/Sourcing/i)).toBeInTheDocument();
      // With 1 unsourced feedback, score should be reduced
    });

    it('should calculate neutrality score based on bias feedback', () => {
      render(
        <ClarityScoreDisplay feedback={[biasFeedback]} />
      );

      expect(screen.getByText(/Neutrality/i)).toBeInTheDocument();
      // With 1 bias feedback, score should be reduced
    });

    it('should not count feedback below confidence threshold', () => {
      const lowConfidenceFeedback = {
        ...unsourcedFeedback,
        confidenceScore: 0.75, // Below 0.80 threshold
      };

      render(
        <ClarityScoreDisplay feedback={[lowConfidenceFeedback]} />
      );

      // Should show no issues since feedback is below threshold
      expect(screen.getByText(/No clarity issues detected/i)).toBeInTheDocument();
    });

    it('should not display feedback marked as not displayed to user', () => {
      const hiddenFeedback = {
        ...unsourcedFeedback,
        displayedToUser: false,
      };

      render(
        <ClarityScoreDisplay feedback={[hiddenFeedback]} />
      );

      // Should show no issues since feedback is not displayed to user
      expect(screen.getByText(/No clarity issues detected/i)).toBeInTheDocument();
    });
  });

  describe('Metric Visualization', () => {
    it('should display sourcing score with progress bar', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
        />
      );

      expect(screen.getByText(/Sourcing/i)).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should display neutrality score with progress bar', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
        />
      );

      expect(screen.getByText(/Neutrality/i)).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('should display specificity score with progress bar', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
        />
      );

      expect(screen.getByText(/Specificity/i)).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should show issue counts for sourcing', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
        />
      );

      expect(screen.getByText(/2 unsourced claims detected/i)).toBeInTheDocument();
    });

    it('should show issue counts for neutrality', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
        />
      );

      expect(screen.getByText(/1 bias indicator detected/i)).toBeInTheDocument();
    });
  });

  describe('Score Labels and Colors', () => {
    it('should show "Excellent" label for scores >= 0.9', () => {
      const excellentMetrics = { ...customMetrics, overallClarityScore: 0.95 };
      render(
        <ClarityScoreDisplay feedback={[]} metrics={excellentMetrics} />
      );

      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should show "Good" label for scores >= 0.8', () => {
      const goodMetrics = { ...customMetrics, overallClarityScore: 0.85 };
      render(
        <ClarityScoreDisplay feedback={[]} metrics={goodMetrics} />
      );

      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should show "Fair" label for scores >= 0.7', () => {
      const fairMetrics = { ...customMetrics, overallClarityScore: 0.75 };
      render(
        <ClarityScoreDisplay feedback={[]} metrics={fairMetrics} />
      );

      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('should show "Needs Improvement" label for scores >= 0.6', () => {
      const needsImprovementMetrics = { ...customMetrics, overallClarityScore: 0.65 };
      render(
        <ClarityScoreDisplay feedback={[]} metrics={needsImprovementMetrics} />
      );

      expect(screen.getByText('Needs Improvement')).toBeInTheDocument();
    });

    it('should show "Poor" label for scores < 0.6', () => {
      const poorMetrics = { ...customMetrics, overallClarityScore: 0.45 };
      render(
        <ClarityScoreDisplay feedback={[]} metrics={poorMetrics} />
      );

      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  describe('Feedback Items', () => {
    it('should display unsourced feedback items', () => {
      render(
        <ClarityScoreDisplay
          feedback={[unsourcedFeedback]}
          onAcknowledge={mockAcknowledge}
        />
      );

      expect(screen.getByText(/Sourcing needed/i)).toBeInTheDocument();
      expect(screen.getByText(unsourcedFeedback.suggestionText)).toBeInTheDocument();
    });

    it('should display bias feedback items', () => {
      render(
        <ClarityScoreDisplay
          feedback={[biasFeedback]}
          onAcknowledge={mockAcknowledge}
        />
      );

      expect(screen.getByText(/Consider neutral language/i)).toBeInTheDocument();
      expect(screen.getByText(biasFeedback.suggestionText)).toBeInTheDocument();
    });

    it('should show confidence scores for feedback items', () => {
      render(
        <ClarityScoreDisplay feedback={[unsourcedFeedback]} />
      );

      expect(screen.getByText(/Confidence: 85%/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onAcknowledge when feedback is acknowledged', () => {
      render(
        <ClarityScoreDisplay
          feedback={[unsourcedFeedback]}
          onAcknowledge={mockAcknowledge}
        />
      );

      const acknowledgeButton = screen.getByRole('button', { name: /Acknowledge feedback/i });
      fireEvent.click(acknowledgeButton);

      expect(mockAcknowledge).toHaveBeenCalledWith(unsourcedFeedback.id);
    });

    it('should not show acknowledge button for already acknowledged feedback', () => {
      const acknowledgedFeedback = {
        ...unsourcedFeedback,
        userAcknowledged: true,
      };

      render(
        <ClarityScoreDisplay
          feedback={[acknowledgedFeedback]}
          onAcknowledge={mockAcknowledge}
        />
      );

      expect(screen.queryByRole('button', { name: /Acknowledge feedback/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for region', () => {
      render(<ClarityScoreDisplay feedback={[]} />);

      expect(screen.getByRole('region', { name: /Clarity analysis/i })).toBeInTheDocument();
    });

    it('should have progress bars with proper ARIA attributes', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
        />
      );

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);

      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('should have status role in compact mode', () => {
      render(
        <ClarityScoreDisplay
          feedback={[]}
          metrics={customMetrics}
          compact
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Multiple Feedback Items', () => {
    it('should display all clarity-related feedback items', () => {
      render(
        <ClarityScoreDisplay
          feedback={[unsourcedFeedback, biasFeedback]}
        />
      );

      expect(screen.getByText(/Sourcing needed/i)).toBeInTheDocument();
      expect(screen.getByText(/Consider neutral language/i)).toBeInTheDocument();
    });

    it('should filter out non-clarity feedback types', () => {
      const toneFeedback: Feedback = {
        id: 'feedback-3',
        responseId: 'response-1',
        type: FeedbackType.INFLAMMATORY,
        suggestionText: 'Consider a more collaborative tone.',
        reasoning: 'Detected hostile language.',
        confidenceScore: 0.85,
        userAcknowledged: false,
        userRevised: false,
        displayedToUser: true,
        createdAt: new Date(),
      };

      render(
        <ClarityScoreDisplay
          feedback={[unsourcedFeedback, toneFeedback]}
        />
      );

      // Should only show unsourced feedback, not tone feedback
      expect(screen.getByText(/Sourcing needed/i)).toBeInTheDocument();
      expect(screen.queryByText(/Consider a more collaborative tone/i)).not.toBeInTheDocument();
    });
  });
});
