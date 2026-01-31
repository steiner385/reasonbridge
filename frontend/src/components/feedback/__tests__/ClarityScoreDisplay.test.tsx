import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClarityScoreDisplay from '../ClarityScoreDisplay';
import type { ClarityAnalysis } from '../../../types/feedback';

describe('ClarityScoreDisplay', () => {
  const mockExcellentClarity: ClarityAnalysis = {
    score: 0.92,
    level: 'excellent',
    confidenceScore: 0.88,
    suggestion: 'Your argument is well-structured and clear.',
  };

  const mockGoodClarity: ClarityAnalysis = {
    score: 0.78,
    level: 'good',
    factors: {
      structure: 0.85,
      specificity: 0.75,
      evidenceSupport: 0.7,
      coherence: 0.82,
      readability: 0.78,
    },
  };

  const mockModerateClarity: ClarityAnalysis = {
    score: 0.55,
    level: 'moderate',
    factors: {
      structure: 0.6,
      specificity: 0.5,
    },
    suggestion: 'Consider adding more specific examples.',
  };

  const mockNeedsImprovementClarity: ClarityAnalysis = {
    score: 0.35,
    level: 'needs_improvement',
    issues: [
      {
        type: 'unsourced_claim',
        description: 'Factual claim without citation',
        example: 'Studies show that...',
        suggestion: 'Add a specific source or citation.',
      },
      {
        type: 'vague_language',
        description: 'Vague reference to unspecified people',
        example: 'Some people say...',
        suggestion: 'Be specific about who says this.',
      },
    ],
  };

  const mockPoorClarity: ClarityAnalysis = {
    score: 0.15,
    level: 'poor',
    issues: [
      {
        type: 'bias_indicator',
        description: 'Loaded language detected',
        suggestion: 'Use more neutral terms.',
      },
      {
        type: 'unclear_structure',
        description: 'Argument structure is hard to follow',
        suggestion: 'Break into clear points.',
      },
    ],
    suggestion: 'This response needs significant revision for clarity.',
  };

  describe('Detailed Variant (default)', () => {
    it('should render detailed variant by default', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} />);

      expect(screen.getByRole('region', { name: /clarity score analysis/i })).toBeInTheDocument();
    });

    it('should display score as percentage', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} />);

      expect(screen.getByText('92')).toBeInTheDocument();
    });

    it('should display clarity level label', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} />);

      expect(screen.getByText('Excellent Clarity')).toBeInTheDocument();
    });

    it('should display confidence score when available', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} />);

      expect(screen.getByText('(88% confident)')).toBeInTheDocument();
    });

    it('should display suggestion when showSuggestions is true', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} showSuggestions />);

      expect(screen.getByText(/your argument is well-structured/i)).toBeInTheDocument();
    });

    it('should hide suggestion when showSuggestions is false', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} showSuggestions={false} />);

      expect(screen.queryByText(/your argument is well-structured/i)).not.toBeInTheDocument();
    });

    it('should have proper meter role on score circle', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} />);

      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '78');
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Clarity Factors', () => {
    it('should display factor breakdown when showFactors is true', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} showFactors />);

      expect(screen.getByText('Clarity Factors')).toBeInTheDocument();
      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Specificity')).toBeInTheDocument();
      expect(screen.getByText('Evidence')).toBeInTheDocument();
      expect(screen.getByText('Coherence')).toBeInTheDocument();
      expect(screen.getByText('Readability')).toBeInTheDocument();
    });

    it('should hide factor breakdown when showFactors is false', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} showFactors={false} />);

      expect(screen.queryByText('Clarity Factors')).not.toBeInTheDocument();
    });

    it('should display factor percentages', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} showFactors />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should not show factors section when no factors provided', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} showFactors />);

      expect(screen.queryByText('Clarity Factors')).not.toBeInTheDocument();
    });
  });

  describe('Issues Display', () => {
    it('should display issues when showIssues is true', () => {
      render(<ClarityScoreDisplay clarity={mockNeedsImprovementClarity} showIssues />);

      expect(screen.getByText('Issues Detected (2)')).toBeInTheDocument();
      expect(screen.getByText('Factual claim without citation')).toBeInTheDocument();
      expect(screen.getByText('Vague reference to unspecified people')).toBeInTheDocument();
    });

    it('should hide issues when showIssues is false', () => {
      render(<ClarityScoreDisplay clarity={mockNeedsImprovementClarity} showIssues={false} />);

      expect(screen.queryByText('Issues Detected')).not.toBeInTheDocument();
    });

    it('should display issue examples when available', () => {
      render(<ClarityScoreDisplay clarity={mockNeedsImprovementClarity} showIssues />);

      expect(screen.getByText('"Studies show that..."')).toBeInTheDocument();
      expect(screen.getByText('"Some people say..."')).toBeInTheDocument();
    });

    it('should display issue suggestions when showSuggestions is true', () => {
      render(
        <ClarityScoreDisplay clarity={mockNeedsImprovementClarity} showIssues showSuggestions />,
      );

      expect(screen.getByText(/add a specific source/i)).toBeInTheDocument();
      expect(screen.getByText(/be specific about who/i)).toBeInTheDocument();
    });

    it('should not show issue suggestions when showSuggestions is false', () => {
      render(
        <ClarityScoreDisplay
          clarity={mockNeedsImprovementClarity}
          showIssues
          showSuggestions={false}
        />,
      );

      expect(screen.queryByText(/add a specific source/i)).not.toBeInTheDocument();
    });

    it('should not show issues section when no issues', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} showIssues />);

      expect(screen.queryByText(/issues detected/i)).not.toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('should render compact badge variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display score percentage in compact variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />);

      expect(screen.getByText('78%')).toBeInTheDocument();
    });

    it('should display level label in compact variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />);

      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should be clickable when onClick is provided', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" onClick={onClick} />);

      await user.click(screen.getByRole('status'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not be clickable when onClick is not provided', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />);

      const button = screen.getByRole('status');
      expect(button).toBeDisabled();
    });
  });

  describe('Inline Variant', () => {
    it('should render inline variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="inline" />);

      expect(screen.getByRole('status', { name: /clarity: 78%/i })).toBeInTheDocument();
    });

    it('should display only score percentage', () => {
      render(<ClarityScoreDisplay clarity={mockModerateClarity} variant="inline" />);

      expect(screen.getByText('55%')).toBeInTheDocument();
      // Should not display factors or issues
      expect(screen.queryByText('Clarity Factors')).not.toBeInTheDocument();
    });
  });

  describe('Clarity Levels', () => {
    it('should render excellent level with green styling', () => {
      const { container } = render(
        <ClarityScoreDisplay clarity={mockExcellentClarity} variant="compact" />,
      );

      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('should render good level with blue styling', () => {
      const { container } = render(
        <ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />,
      );

      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });

    it('should render moderate level with yellow styling', () => {
      const { container } = render(
        <ClarityScoreDisplay clarity={mockModerateClarity} variant="compact" />,
      );

      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
    });

    it('should render needs_improvement level with orange styling', () => {
      const { container } = render(
        <ClarityScoreDisplay clarity={mockNeedsImprovementClarity} variant="compact" />,
      );

      expect(container.querySelector('.bg-orange-500')).toBeInTheDocument();
    });

    it('should render poor level with red styling', () => {
      const { container } = render(
        <ClarityScoreDisplay clarity={mockPoorClarity} variant="compact" />,
      );

      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} size="sm" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('p-2');
    });

    it('should render medium size (default)', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} size="md" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('p-3');
    });

    it('should render large size', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} size="lg" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('p-4');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role="region" on detailed variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} />);

      expect(screen.getByRole('region', { name: /clarity score analysis/i })).toBeInTheDocument();
    });

    it('should have proper role="status" on compact variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have proper aria-label on compact variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="compact" />);

      expect(screen.getByRole('status', { name: /clarity score: 78%, good/i })).toBeInTheDocument();
    });

    it('should have proper role="status" on inline variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} variant="inline" />);

      expect(screen.getByRole('status', { name: /clarity: 78%/i })).toBeInTheDocument();
    });

    it('should have progressbar roles on factor bars', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} showFactors />);

      const progressbars = screen.getAllByRole('progressbar');
      expect(progressbars.length).toBe(5);
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to detailed variant', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} className="custom-class" />);

      const container = screen.getByRole('region');
      expect(container.className).toContain('custom-class');
    });

    it('should apply custom className to compact variant', () => {
      render(
        <ClarityScoreDisplay
          clarity={mockGoodClarity}
          variant="compact"
          className="custom-class"
        />,
      );

      const container = screen.getByRole('status');
      expect(container.className).toContain('custom-class');
    });

    it('should apply custom className to inline variant', () => {
      const { container } = render(
        <ClarityScoreDisplay clarity={mockGoodClarity} variant="inline" className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Click Handler', () => {
    it('should show view details button when onClick is provided', () => {
      const onClick = vi.fn();
      render(<ClarityScoreDisplay clarity={mockGoodClarity} onClick={onClick} />);

      expect(screen.getByRole('button', { name: /view detailed analysis/i })).toBeInTheDocument();
    });

    it('should call onClick when view details is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ClarityScoreDisplay clarity={mockGoodClarity} onClick={onClick} />);

      await user.click(screen.getByRole('button', { name: /view detailed analysis/i }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not show view details button when onClick is not provided', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} />);

      expect(
        screen.queryByRole('button', { name: /view detailed analysis/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Level Descriptions', () => {
    it('should show excellent description', () => {
      render(<ClarityScoreDisplay clarity={mockExcellentClarity} />);

      expect(screen.getByText(/clear, well-structured, and well-supported/i)).toBeInTheDocument();
    });

    it('should show good description', () => {
      render(<ClarityScoreDisplay clarity={mockGoodClarity} />);

      expect(screen.getByText(/generally clear with minor areas/i)).toBeInTheDocument();
    });

    it('should show moderate description', () => {
      render(<ClarityScoreDisplay clarity={mockModerateClarity} />);

      expect(screen.getByText(/some clarity issues that could be addressed/i)).toBeInTheDocument();
    });

    it('should show needs_improvement description', () => {
      render(<ClarityScoreDisplay clarity={mockNeedsImprovementClarity} />);

      expect(screen.getByText(/several areas need clarification/i)).toBeInTheDocument();
    });

    it('should show poor description', () => {
      render(<ClarityScoreDisplay clarity={mockPoorClarity} />);

      expect(screen.getByText(/significant clarity issues/i)).toBeInTheDocument();
    });
  });
});
