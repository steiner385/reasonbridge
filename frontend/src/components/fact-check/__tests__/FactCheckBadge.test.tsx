/**
 * Unit tests for FactCheckBadge component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FactCheckBadge from '../FactCheckBadge';
import type { FactCheckResult } from '../../../types/factCheck';

// Mock the factCheckService
vi.mock('../../../services/factCheckService', () => ({
  factCheckService: {
    getOverallStatus: vi.fn((results: FactCheckResult[]) => {
      if (results.length === 0) return 'no-context';
      if (results.some((r) => r.hasConflictingSources)) return 'conflicts';
      if (results.some((r) => r.sources.length > 0)) return 'has-context';
      return 'no-context';
    }),
  },
}));

describe('FactCheckBadge', () => {
  const mockResults: FactCheckResult[] = [
    {
      id: 'result-1',
      claimText: 'Test claim',
      displayedAs: 'Related Context',
      sources: [
        {
          provider: 'Snopes',
          url: 'https://snopes.com/test',
          title: 'Test Source',
          credibilityScore: 0.9,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
        {
          provider: 'PolitiFact',
          url: 'https://politifact.com/test',
          title: 'Another Source',
          credibilityScore: 0.85,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
      ],
      hasConflictingSources: false,
      expiresAt: '2025-01-16T12:00:00Z',
    },
  ];

  const conflictingResults: FactCheckResult[] = [
    {
      id: 'result-conflict',
      claimText: 'Conflicting claim',
      displayedAs: 'Related Context',
      sources: [
        {
          provider: 'Source A',
          url: 'https://a.com',
          title: 'Source A',
          credibilityScore: 0.8,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
      ],
      hasConflictingSources: true,
      conflictSummary: 'Sources disagree.',
      expiresAt: '2025-01-16T12:00:00Z',
    },
  ];

  describe('Rendering', () => {
    it('should not render when variant is idle', () => {
      const { container } = render(<FactCheckBadge variant="idle" />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when status is idle and no results', () => {
      const { container } = render(<FactCheckBadge status="idle" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render has-context badge with results', () => {
      render(<FactCheckBadge status="success" results={mockResults} showLabel />);
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });

    it('should render no-context badge', () => {
      render(<FactCheckBadge variant="no-context" showLabel />);
      expect(screen.getByText('No context')).toBeInTheDocument();
    });

    it('should render conflicts badge', () => {
      render(<FactCheckBadge status="success" results={conflictingResults} showLabel />);
      expect(screen.getByText('Conflicting')).toBeInTheDocument();
    });

    it('should render loading badge', () => {
      render(<FactCheckBadge status="loading" showLabel />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('should render loading badge with variant prop', () => {
      render(<FactCheckBadge variant="loading" showLabel />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should show check icon for has-context', () => {
      const { container } = render(<FactCheckBadge variant="has-context" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show info icon for no-context', () => {
      const { container } = render(<FactCheckBadge variant="no-context" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show warning icon for conflicts', () => {
      const { container } = render(<FactCheckBadge variant="conflicts" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show spinning icon for loading', () => {
      const { container } = render(<FactCheckBadge variant="loading" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes by default', () => {
      render(<FactCheckBadge variant="has-context" />);
      const badge = screen.getByLabelText(/Fact-check found/);
      expect(badge).toHaveClass('h-5');
    });

    it('should apply medium size classes', () => {
      render(<FactCheckBadge variant="has-context" size="md" />);
      const badge = screen.getByLabelText(/Fact-check found/);
      expect(badge).toHaveClass('h-6');
    });
  });

  describe('Labels', () => {
    it('should not show label by default', () => {
      render(<FactCheckBadge variant="has-context" sourceCount={3} />);
      expect(screen.queryByText('3 sources')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<FactCheckBadge variant="has-context" sourceCount={3} showLabel />);
      expect(screen.getByText('3 sources')).toBeInTheDocument();
    });

    it('should use singular form for 1 source', () => {
      render(<FactCheckBadge variant="has-context" sourceCount={1} showLabel />);
      expect(screen.getByText('1 source')).toBeInTheDocument();
    });

    it('should calculate source count from results', () => {
      render(<FactCheckBadge status="success" results={mockResults} showLabel />);
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply green colors for has-context', () => {
      render(<FactCheckBadge variant="has-context" />);
      const badge = screen.getByLabelText(/Fact-check found/);
      expect(badge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('should apply gray colors for no-context', () => {
      render(<FactCheckBadge variant="no-context" />);
      const badge = screen.getByLabelText(/No fact-check context found/);
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-600');
    });

    it('should apply amber colors for conflicts', () => {
      render(<FactCheckBadge variant="conflicts" />);
      const badge = screen.getByLabelText(/conflicting information/);
      expect(badge).toHaveClass('bg-amber-100', 'text-amber-700');
    });

    it('should apply blue colors for loading', () => {
      render(<FactCheckBadge variant="loading" />);
      const badge = screen.getByLabelText('Checking facts...');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-600');
    });

    it('should apply custom className', () => {
      render(<FactCheckBadge variant="has-context" className="custom-class" />);
      const badge = screen.getByLabelText(/Fact-check found/);
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('should render as span when no onClick', () => {
      render(<FactCheckBadge variant="has-context" />);
      const badge = screen.getByLabelText(/Fact-check found/);
      expect(badge.tagName).toBe('SPAN');
    });

    it('should render as button when onClick provided', () => {
      render(<FactCheckBadge variant="has-context" onClick={() => {}} />);
      const badge = screen.getByRole('button');
      expect(badge).toBeInTheDocument();
    });

    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      render(<FactCheckBadge variant="has-context" onClick={onClick} />);

      await userEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });

    it('should have interactive styles when clickable', () => {
      render(<FactCheckBadge variant="has-context" onClick={() => {}} />);
      const badge = screen.getByRole('button');
      expect(badge).toHaveClass('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label for has-context', () => {
      render(<FactCheckBadge variant="has-context" sourceCount={3} />);
      expect(screen.getByLabelText('Fact-check found 3 sources')).toBeInTheDocument();
    });

    it('should have appropriate aria-label for no-context', () => {
      render(<FactCheckBadge variant="no-context" />);
      expect(screen.getByLabelText('No fact-check context found')).toBeInTheDocument();
    });

    it('should have appropriate aria-label for conflicts', () => {
      render(<FactCheckBadge variant="conflicts" />);
      expect(
        screen.getByLabelText('Fact-check sources have conflicting information'),
      ).toBeInTheDocument();
    });

    it('should have title attribute', () => {
      render(<FactCheckBadge variant="has-context" sourceCount={2} />);
      const badge = screen.getByLabelText(/Fact-check found/);
      expect(badge).toHaveAttribute('title', 'Fact-check found 2 sources');
    });

    it('should have type="button" when clickable', () => {
      render(<FactCheckBadge variant="has-context" onClick={() => {}} />);
      const badge = screen.getByRole('button');
      expect(badge).toHaveAttribute('type', 'button');
    });
  });

  describe('Status to Variant Mapping', () => {
    it('should map loading status to loading variant', () => {
      render(<FactCheckBadge status="loading" showLabel />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('should map success status with results to has-context', () => {
      render(<FactCheckBadge status="success" results={mockResults} showLabel />);
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });

    it('should map no-results status to no-context', () => {
      render(<FactCheckBadge status="no-results" showLabel />);
      expect(screen.getByText('No context')).toBeInTheDocument();
    });

    it('should prefer variant prop over status', () => {
      render(<FactCheckBadge status="loading" variant="has-context" showLabel sourceCount={5} />);
      expect(screen.getByText('5 sources')).toBeInTheDocument();
      expect(screen.queryByText('Checking...')).not.toBeInTheDocument();
    });
  });
});
