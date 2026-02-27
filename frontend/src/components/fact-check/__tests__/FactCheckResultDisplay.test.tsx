/**
 * Unit tests for FactCheckResultDisplay component
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FactCheckResultDisplay from '../FactCheckResultDisplay';
import type { FactCheckResult } from '../../../types/factCheck';

describe('FactCheckResultDisplay', () => {
  const mockResults: FactCheckResult[] = [
    {
      id: 'result-1',
      claimText: 'The Earth is approximately 4.5 billion years old.',
      displayedAs: 'Related Context',
      sources: [
        {
          provider: 'Snopes',
          url: 'https://snopes.com/earth-age',
          title: 'How Old is the Earth?',
          publishedAt: '2024-01-15T00:00:00Z',
          rating: 'True',
          ratingDescription: 'Scientific consensus supports this claim.',
          credibilityScore: 0.95,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
        {
          provider: 'PolitiFact',
          url: 'https://politifact.com/earth-age',
          title: 'Earth Age Fact Check',
          credibilityScore: 0.9,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
      ],
      hasConflictingSources: false,
      expiresAt: '2025-01-16T12:00:00Z',
    },
    {
      id: 'result-2',
      claimText: 'Coffee consumption has increased by 50% globally.',
      displayedAs: 'Related Context',
      sources: [
        {
          provider: 'FactCheck.org',
          url: 'https://factcheck.org/coffee-stats',
          title: 'Coffee Consumption Statistics',
          rating: 'Misleading',
          credibilityScore: 0.85,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
      ],
      hasConflictingSources: true,
      conflictSummary: 'Different studies report varying percentages.',
      expiresAt: '2025-01-16T12:00:00Z',
    },
  ];

  describe('Rendering', () => {
    it('should render nothing when results are empty', () => {
      const { container } = render(<FactCheckResultDisplay results={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render header with claim count', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(screen.getByText('Related Context')).toBeInTheDocument();
      expect(screen.getByText('2 claims checked')).toBeInTheDocument();
    });

    it('should render custom label', () => {
      render(<FactCheckResultDisplay results={mockResults} label="Custom Label" />);
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should render all claim texts', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(
        screen.getByText('\u201CThe Earth is approximately 4.5 billion years old.\u201D'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('\u201CCoffee consumption has increased by 50% globally.\u201D'),
      ).toBeInTheDocument();
    });

    it('should show source count for each claim', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(screen.getByText('2 sources')).toBeInTheDocument();
      expect(screen.getByText('1 source')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <FactCheckResultDisplay results={mockResults} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Expand/Collapse', () => {
    it('should expand first result by default in non-compact mode', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      // First result should have its sources visible
      expect(screen.getByText('How Old is the Earth?')).toBeInTheDocument();
    });

    it('should not expand results in compact mode', () => {
      render(<FactCheckResultDisplay results={mockResults} compact />);
      // Sources should not be visible initially
      expect(screen.queryByText('How Old is the Earth?')).not.toBeInTheDocument();
    });

    it('should toggle result expansion on click', async () => {
      render(<FactCheckResultDisplay results={mockResults} compact />);

      // Click to expand first result
      const buttons = screen.getAllByRole('button');
      await userEvent.click(buttons[0]);

      expect(screen.getByText('How Old is the Earth?')).toBeInTheDocument();

      // Click to collapse
      await userEvent.click(buttons[0]);
      expect(screen.queryByText('How Old is the Earth?')).not.toBeInTheDocument();
    });

    it('should have correct aria-expanded attribute', async () => {
      render(<FactCheckResultDisplay results={mockResults} compact />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(buttons[0]);
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Source Cards', () => {
    it('should render source title as link', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      const link = screen.getByText('How Old is the Earth?');
      expect(link.closest('a')).toHaveAttribute('href', 'https://snopes.com/earth-age');
    });

    it('should open link in new tab', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      const link = screen.getByText('How Old is the Earth?').closest('a');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show provider name', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(screen.getByText('Snopes')).toBeInTheDocument();
    });

    it('should show credibility score as percentage', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should show rating when available', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(screen.getByText('True')).toBeInTheDocument();
    });

    it('should show rating description when available', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      expect(screen.getByText('Scientific consensus supports this claim.')).toBeInTheDocument();
    });

    it('should show published date when available', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      // Date format depends on locale, check for "Published:"
      expect(screen.getByText(/Published:/)).toBeInTheDocument();
    });
  });

  describe('Conflicting Sources', () => {
    it('should show conflict indicator', async () => {
      render(<FactCheckResultDisplay results={mockResults} compact />);

      // Click to expand second result
      const buttons = screen.getAllByRole('button');
      await userEvent.click(buttons[1]);

      expect(screen.getByText('Conflicting info')).toBeInTheDocument();
    });

    it('should show conflict summary when expanded', async () => {
      render(<FactCheckResultDisplay results={mockResults} compact />);

      // Click to expand second result (which has conflicts)
      const buttons = screen.getAllByRole('button');
      await userEvent.click(buttons[1]);

      expect(screen.getByText('Different studies report varying percentages.')).toBeInTheDocument();
    });
  });

  describe('Empty Sources', () => {
    it('should show message when claim has no sources', async () => {
      const resultsWithNoSources: FactCheckResult[] = [
        {
          id: 'result-empty',
          claimText: 'Some unchecked claim.',
          displayedAs: 'Related Context',
          sources: [],
          hasConflictingSources: false,
          expiresAt: '2025-01-16T12:00:00Z',
        },
      ];

      render(<FactCheckResultDisplay results={resultsWithNoSources} />);
      expect(screen.getByText('No external sources found for this claim.')).toBeInTheDocument();
    });
  });

  describe('Credibility Colors', () => {
    it('should use green color for high credibility (>= 0.8)', () => {
      render(<FactCheckResultDisplay results={mockResults} />);
      const credibilityScore = screen.getByText('95%');
      expect(credibilityScore).toHaveClass('text-green-600');
    });

    it('should use yellow color for medium credibility (0.5-0.8)', () => {
      const mediumCredResults: FactCheckResult[] = [
        {
          id: 'result-medium',
          claimText: 'Medium credibility claim.',
          displayedAs: 'Related Context',
          sources: [
            {
              provider: 'Medium Source',
              url: 'https://example.com',
              title: 'Medium Credibility',
              credibilityScore: 0.6,
              retrievedAt: '2025-01-15T12:00:00Z',
            },
          ],
          hasConflictingSources: false,
          expiresAt: '2025-01-16T12:00:00Z',
        },
      ];

      render(<FactCheckResultDisplay results={mediumCredResults} />);
      const credibilityScore = screen.getByText('60%');
      expect(credibilityScore).toHaveClass('text-yellow-600');
    });

    it('should use red color for low credibility (< 0.5)', () => {
      const lowCredResults: FactCheckResult[] = [
        {
          id: 'result-low',
          claimText: 'Low credibility claim.',
          displayedAs: 'Related Context',
          sources: [
            {
              provider: 'Low Source',
              url: 'https://example.com',
              title: 'Low Credibility',
              credibilityScore: 0.3,
              retrievedAt: '2025-01-15T12:00:00Z',
            },
          ],
          hasConflictingSources: false,
          expiresAt: '2025-01-16T12:00:00Z',
        },
      ];

      render(<FactCheckResultDisplay results={lowCredResults} />);
      const credibilityScore = screen.getByText('30%');
      expect(credibilityScore).toHaveClass('text-red-700');
    });
  });
});
