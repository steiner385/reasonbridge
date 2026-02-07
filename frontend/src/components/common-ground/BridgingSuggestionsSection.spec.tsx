import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BridgingSuggestionsResponse } from '../../types/common-ground';
import BridgingSuggestionsSection from './BridgingSuggestionsSection';

describe('BridgingSuggestionsSection', () => {
  const mockSuggestions: BridgingSuggestionsResponse = {
    overallConsensusScore: 0.68,
    reasoning: 'The discussion shows moderate consensus with some key areas of disagreement',
    commonGroundAreas: ['Climate change is real', 'Action is needed', 'Future generations matter'],
    conflictAreas: ['Economic priorities', 'Speed of transition', 'Government intervention'],
    suggestions: [
      {
        propositionId: 'prop-1',
        sourcePosition: 'Rapid transition advocates',
        targetPosition: 'Gradual transition advocates',
        bridgingLanguage:
          'We can pursue aggressive climate goals while ensuring economic stability through phased implementation',
        commonGround:
          'Both groups agree that climate action is necessary and economic stability is important',
        reasoning:
          'Acknowledges both the urgency of climate action and the need for economic considerations',
        confidenceScore: 0.85,
      },
      {
        propositionId: 'prop-2',
        sourcePosition: 'Market-based solutions',
        targetPosition: 'Government regulation',
        bridgingLanguage:
          'A hybrid approach combining market incentives with regulatory guardrails can be most effective',
        commonGround: 'Both groups want effective solutions that drive real change',
        reasoning: 'Combines the efficiency of markets with the accountability of regulation',
        confidenceScore: 0.72,
      },
      {
        propositionId: 'prop-3',
        sourcePosition: 'Individual responsibility',
        targetPosition: 'Corporate responsibility',
        bridgingLanguage:
          'Change requires action at both individual and corporate levels, with each reinforcing the other',
        commonGround: 'Both groups recognize that meaningful change requires broad participation',
        reasoning: 'Acknowledges that systemic and individual changes are complementary',
        confidenceScore: 0.55,
      },
    ],
    attribution: 'AI-generated bridging suggestions powered by Claude',
  };

  describe('Overall Analysis Display', () => {
    it('should display overall consensus score', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('68%')).toBeInTheDocument();
      expect(screen.getByText('Overall Consensus')).toBeInTheDocument();
    });

    it('should display consensus score as progress bar', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '68%' });
      expect(progressBar).toHaveAttribute('aria-valuenow', '68');
    });

    it('should display analysis reasoning', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(
        screen.getByText(
          'The discussion shows moderate consensus with some key areas of disagreement',
        ),
      ).toBeInTheDocument();
    });

    it('should display common ground areas as badges', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('Climate change is real')).toBeInTheDocument();
      expect(screen.getByText('Action is needed')).toBeInTheDocument();
      expect(screen.getByText('Future generations matter')).toBeInTheDocument();
    });

    it('should display conflict areas as badges', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('Economic priorities')).toBeInTheDocument();
      expect(screen.getByText('Speed of transition')).toBeInTheDocument();
      expect(screen.getByText('Government intervention')).toBeInTheDocument();
    });
  });

  describe('Bridging Suggestions', () => {
    it('should display suggestion count', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText(/Suggested Bridges \(3\)/i)).toBeInTheDocument();
    });

    it('should display source and target positions', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('Rapid transition advocates')).toBeInTheDocument();
      expect(screen.getByText('Gradual transition advocates')).toBeInTheDocument();
    });

    it('should display bridging language', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(
        screen.getByText(
          /We can pursue aggressive climate goals while ensuring economic stability/i,
        ),
      ).toBeInTheDocument();
    });

    it('should display common ground explanation', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(
        screen.getByText(
          /Both groups agree that climate action is necessary and economic stability is important/i,
        ),
      ).toBeInTheDocument();
    });

    it('should display reasoning for each suggestion', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(
        screen.getByText(
          /Acknowledges both the urgency of climate action and the need for economic considerations/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Confidence Scores', () => {
    it('should display high confidence badge for score >= 0.8', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('High Confidence')).toBeInTheDocument();
    });

    it('should display medium confidence badge for score >= 0.6 && < 0.8', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
    });

    it('should display lower confidence badge for score < 0.6', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText('Lower Confidence')).toBeInTheDocument();
    });

    it('should display numeric confidence score', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.getByText(/Confidence Score: 85%/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence Score: 72%/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence Score: 55%/i)).toBeInTheDocument();
    });

    it('should have proper test IDs for confidence levels', () => {
      const { container } = render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(container.querySelector('[data-testid="confidence-high"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="confidence-medium"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="confidence-low"]')).toBeInTheDocument();
    });
  });

  describe('View Proposition Button', () => {
    it('should display View Proposition button when callback provided', () => {
      const handleClick = vi.fn();
      render(
        <BridgingSuggestionsSection suggestions={mockSuggestions} onViewSuggestion={handleClick} />,
      );

      const buttons = screen.getAllByText('View Proposition →');
      expect(buttons).toHaveLength(3);
    });

    it('should call onViewSuggestion with propositionId when clicked', () => {
      const handleClick = vi.fn();
      render(
        <BridgingSuggestionsSection suggestions={mockSuggestions} onViewSuggestion={handleClick} />,
      );

      const buttons = screen.getAllByText('View Proposition →');
      buttons[0].click();

      expect(handleClick).toHaveBeenCalledWith('prop-1');
    });

    it('should not display button when callback not provided', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(screen.queryByText('View Proposition →')).not.toBeInTheDocument();
    });
  });

  describe('Max Suggestions Limit', () => {
    it('should show all suggestions when maxSuggestions=0', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} maxSuggestions={0} />);

      expect(screen.getByText(/Suggested Bridges \(3\)/i)).toBeInTheDocument();
    });

    it('should limit displayed suggestions when maxSuggestions is set', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} maxSuggestions={2} />);

      expect(screen.getByText(/Suggested Bridges \(2 of 3\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing 2 of 3 suggestions/i)).toBeInTheDocument();
    });

    it('should only show first N suggestions when limited', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} maxSuggestions={1} />);

      // First suggestion should be visible
      expect(screen.getByText('Rapid transition advocates')).toBeInTheDocument();

      // Second and third suggestions should not be visible
      expect(screen.queryByText('Market-based solutions')).not.toBeInTheDocument();
      expect(screen.queryByText('Individual responsibility')).not.toBeInTheDocument();
    });
  });

  describe('AI Attribution', () => {
    it('should display attribution by default', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(
        screen.getByText('AI-generated bridging suggestions powered by Claude'),
      ).toBeInTheDocument();
    });

    it('should hide attribution when showAttribution=false', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} showAttribution={false} />);

      expect(
        screen.queryByText('AI-generated bridging suggestions powered by Claude'),
      ).not.toBeInTheDocument();
    });

    it('should not show attribution when no suggestions', () => {
      const emptySuggestions: BridgingSuggestionsResponse = {
        ...mockSuggestions,
        suggestions: [],
      };

      render(<BridgingSuggestionsSection suggestions={emptySuggestions} />);

      expect(
        screen.queryByText('AI-generated bridging suggestions powered by Claude'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    const emptySuggestions: BridgingSuggestionsResponse = {
      overallConsensusScore: 0,
      reasoning: '',
      commonGroundAreas: [],
      conflictAreas: [],
      suggestions: [],
      attribution: 'AI-generated bridging suggestions powered by Claude',
    };

    it('should display empty state when no suggestions and showEmptyState=true', () => {
      render(<BridgingSuggestionsSection suggestions={emptySuggestions} showEmptyState />);

      expect(screen.getByText('No Bridging Suggestions Available')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Bridging suggestions will appear here once the discussion has enough diverse viewpoints/i,
        ),
      ).toBeInTheDocument();
    });

    it('should not render when no suggestions and showEmptyState=false', () => {
      const { container } = render(
        <BridgingSuggestionsSection suggestions={emptySuggestions} showEmptyState={false} />,
      );

      expect(
        container.querySelector('[data-testid="bridging-suggestions"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Styling and Accessibility', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BridgingSuggestionsSection suggestions={mockSuggestions} className="custom-class" />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should have proper test IDs', () => {
      const { container } = render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(container.querySelector('[data-testid="bridging-suggestions"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="overall-consensus"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="consensus-progress"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="analysis-reasoning"]')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for suggestion cards', () => {
      render(<BridgingSuggestionsSection suggestions={mockSuggestions} />);

      expect(
        screen.getByLabelText(
          'Bridging suggestion from Rapid transition advocates to Gradual transition advocates',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalSuggestions: BridgingSuggestionsResponse = {
        overallConsensusScore: 0.5,
        reasoning: undefined,
        commonGroundAreas: undefined,
        conflictAreas: undefined,
        suggestions: [],
        attribution: 'Test attribution',
      };

      const { container } = render(<BridgingSuggestionsSection suggestions={minimalSuggestions} />);

      expect(container).toBeInTheDocument();
      expect(screen.queryByTestId('analysis-reasoning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('common-ground-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('conflict-area-badge')).not.toBeInTheDocument();
    });

    it('should handle null suggestions array', () => {
      const nullSuggestions: BridgingSuggestionsResponse = {
        overallConsensusScore: 0,
        reasoning: '',
        commonGroundAreas: [],
        conflictAreas: [],
        suggestions: null as unknown as BridgingSuggestion[],
        attribution: 'Test',
      };

      const { container } = render(<BridgingSuggestionsSection suggestions={nullSuggestions} />);

      expect(container).toBeInTheDocument();
    });
  });
});
