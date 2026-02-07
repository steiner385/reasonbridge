import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropositionList, type PropositionItem } from './PropositionList';

describe('PropositionList', () => {
  const mockPropositions: PropositionItem[] = [
    {
      id: 'prop-1',
      statement: 'Climate change requires immediate action',
      alignmentData: {
        supportCount: 25,
        opposeCount: 5,
        nuancedCount: 10,
        consensusScore: 0.75,
      },
      relatedResponseIds: ['resp-1', 'resp-2', 'resp-3'],
    },
    {
      id: 'prop-2',
      statement: 'Renewable energy is the future',
      alignmentData: {
        supportCount: 30,
        opposeCount: 8,
        nuancedCount: 2,
        consensusScore: 0.85,
      },
      relatedResponseIds: ['resp-4', 'resp-5'],
    },
    {
      id: 'prop-3',
      statement: 'Economic growth vs environmental protection',
      alignmentData: {
        supportCount: 15,
        opposeCount: 18,
        nuancedCount: 12,
        consensusScore: 0.4,
      },
      relatedResponseIds: [],
    },
  ];

  const mockOnHover = vi.fn();
  const mockOnClick = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all propositions', () => {
      render(<PropositionList propositions={mockPropositions} />);

      expect(screen.getByText('Climate change requires immediate action')).toBeInTheDocument();
      expect(screen.getByText('Renewable energy is the future')).toBeInTheDocument();
      expect(screen.getByText('Economic growth vs environmental protection')).toBeInTheDocument();
    });

    it('should display alignment counts for each proposition', () => {
      render(<PropositionList propositions={mockPropositions} />);

      // Check first proposition's counts
      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      expect(firstProp).toHaveTextContent('25'); // support
      expect(firstProp).toHaveTextContent('5'); // oppose
      expect(firstProp).toHaveTextContent('10'); // nuanced
    });

    it('should display consensus score as percentage', () => {
      render(<PropositionList propositions={mockPropositions} />);

      expect(screen.getByText('75%')).toBeInTheDocument(); // 0.75 * 100
      expect(screen.getByText('85%')).toBeInTheDocument(); // 0.85 * 100
      expect(screen.getByText('40%')).toBeInTheDocument(); // 0.4 * 100
    });

    it('should display related responses count', () => {
      render(<PropositionList propositions={mockPropositions} />);

      expect(screen.getByText('3 related responses')).toBeInTheDocument();
      expect(screen.getByText('2 related responses')).toBeInTheDocument();
    });

    it('should show singular "response" for single related response', () => {
      const singleRelated: PropositionItem[] = [
        {
          ...mockPropositions[0],
          relatedResponseIds: ['resp-1'],
        },
      ];

      render(<PropositionList propositions={singleRelated} />);

      expect(screen.getByText('1 related response')).toBeInTheDocument();
    });

    it('should render empty state when no propositions', () => {
      render(<PropositionList propositions={[]} />);

      expect(screen.getByText('No propositions yet')).toBeInTheDocument();
      expect(screen.getByText(/Propositions will appear/i)).toBeInTheDocument();
    });
  });

  describe('Highlighting', () => {
    it('should highlight the specified proposition', () => {
      render(<PropositionList propositions={mockPropositions} highlightedPropositionId="prop-2" />);

      const highlightedProp = screen
        .getByText('Renewable energy is the future')
        .closest('[data-proposition-id]');
      expect(highlightedProp).toHaveClass('border-primary-500');
      expect(highlightedProp).toHaveClass('bg-primary-50');
    });

    it('should not highlight when highlightedPropositionId is null', () => {
      render(<PropositionList propositions={mockPropositions} highlightedPropositionId={null} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      expect(firstProp).not.toHaveClass('border-primary-500');
      expect(firstProp).toHaveClass('border-gray-200');
    });
  });

  describe('Hover interaction', () => {
    it('should call onPropositionHover when mouse enters proposition', () => {
      render(<PropositionList propositions={mockPropositions} onPropositionHover={mockOnHover} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      fireEvent.mouseEnter(firstProp!);

      expect(mockOnHover).toHaveBeenCalledWith('prop-1');
    });

    it('should call onPropositionHover with null when mouse leaves proposition', () => {
      render(<PropositionList propositions={mockPropositions} onPropositionHover={mockOnHover} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      fireEvent.mouseLeave(firstProp!);

      expect(mockOnHover).toHaveBeenCalledWith(null);
    });
  });

  describe('Click interaction', () => {
    it('should call onPropositionClick when proposition is clicked', () => {
      render(<PropositionList propositions={mockPropositions} onPropositionClick={mockOnClick} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      fireEvent.click(firstProp!);

      expect(mockOnClick).toHaveBeenCalledWith('prop-1', ['resp-1', 'resp-2', 'resp-3']);
    });

    it('should call onPropositionClick with empty array when no related responses', () => {
      render(<PropositionList propositions={mockPropositions} onPropositionClick={mockOnClick} />);

      const thirdProp = screen
        .getByText('Economic growth vs environmental protection')
        .closest('[data-proposition-id]');
      fireEvent.click(thirdProp!);

      expect(mockOnClick).toHaveBeenCalledWith('prop-3', []);
    });
  });

  describe('Keyboard accessibility', () => {
    it('should call onPropositionClick when Enter is pressed', () => {
      render(<PropositionList propositions={mockPropositions} onPropositionClick={mockOnClick} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      fireEvent.keyDown(firstProp!, { key: 'Enter' });

      expect(mockOnClick).toHaveBeenCalledWith('prop-1', ['resp-1', 'resp-2', 'resp-3']);
    });

    it('should call onPropositionClick when Space is pressed', () => {
      render(<PropositionList propositions={mockPropositions} onPropositionClick={mockOnClick} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      fireEvent.keyDown(firstProp!, { key: ' ' });

      expect(mockOnClick).toHaveBeenCalledWith('prop-1', ['resp-1', 'resp-2', 'resp-3']);
    });

    it('should have tabIndex=0 for keyboard navigation', () => {
      render(<PropositionList propositions={mockPropositions} />);

      const firstProp = screen
        .getByText('Climate change requires immediate action')
        .closest('[data-proposition-id]');
      expect(firstProp).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA labels', () => {
      render(<PropositionList propositions={mockPropositions} />);

      const firstProp = screen.getByLabelText(
        'Proposition: Climate change requires immediate action',
      );
      expect(firstProp).toBeInTheDocument();
    });
  });

  describe('Consensus color coding', () => {
    it('should use green for high consensus (>=0.7)', () => {
      render(<PropositionList propositions={[mockPropositions[0]]} />);

      const badge = screen.getByText('75%');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('should use yellow for medium consensus (0.4-0.69)', () => {
      render(<PropositionList propositions={[mockPropositions[2]]} />);

      const badge = screen.getByText('40%');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });

    it('should use red for low consensus (<0.4)', () => {
      const lowConsensus: PropositionItem = {
        ...mockPropositions[0],
        alignmentData: {
          ...mockPropositions[0].alignmentData,
          consensusScore: 0.2,
        },
      };

      render(<PropositionList propositions={[lowConsensus]} />);

      const badge = screen.getByText('20%');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });

    it('should use gray when consensus score is null', () => {
      const nullConsensus: PropositionItem = {
        ...mockPropositions[0],
        alignmentData: {
          ...mockPropositions[0].alignmentData,
          consensusScore: null,
        },
      };

      render(<PropositionList propositions={[nullConsensus]} />);

      // Should not render consensus badge
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });
});
