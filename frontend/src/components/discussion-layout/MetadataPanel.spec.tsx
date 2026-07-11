import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Topic } from '../../types/topic';
import type { PropositionItem } from '../common-ground/PropositionList';
import { MetadataPanel } from './MetadataPanel';

// CommonGroundSummaryPanel is imported as a DEFAULT export by the component
vi.mock('../common-ground/CommonGroundSummaryPanel', () => ({
  default: ({ analysis }: Record<string, unknown>) => (
    <div data-testid="common-ground-summary">
      Common Ground: {(analysis as { consensusLevel?: string })?.consensusLevel || 'N/A'}
    </div>
  ),
}));

// BridgingSuggestionsSection is imported as a DEFAULT export by the component
vi.mock('../common-ground/BridgingSuggestionsSection', () => ({
  default: ({ suggestions }: Record<string, unknown>) => (
    <div data-testid="bridging-suggestions">
      Bridging: {(suggestions as { suggestions?: unknown[] })?.suggestions?.length || 0} suggestions
    </div>
  ),
}));

// PropositionList is imported as a NAMED export
vi.mock('../common-ground/PropositionList', () => ({
  PropositionList: ({
    propositions,
    onPropositionHover,
    onPropositionClick,
  }: Record<string, unknown>) => (
    <div data-testid="proposition-list">
      Propositions: {(propositions as unknown[]).length}
      <button onClick={() => (onPropositionHover as (id: string) => void)?.('prop-1')}>
        Hover Prop 1
      </button>
      <button
        onClick={() =>
          (onPropositionClick as (id: string, ids: string[]) => void)?.('prop-1', ['resp-1'])
        }
      >
        Click Prop 1
      </button>
    </div>
  ),
}));

// TopicStatusActions renders on the Propositions tab; stub it out
vi.mock('../topics/TopicStatusActions', () => ({
  TopicStatusActions: () => <div data-testid="topic-status-actions" />,
}));

// Auth context - provide an authenticated user so useAuthContext doesn't throw
vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1', role: 'USER' },
    isAuthenticated: true,
  }),
}));

// Force desktop/tablet tab layout (not mobile accordion)
vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'desktop',
}));

// WebSocket subscribe is a no-op that returns an unsubscribe function
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: () => () => {},
    send: vi.fn(),
    isConnected: false,
  }),
}));

// No layout context in tests (safe variant returns null)
vi.mock('../../contexts/DiscussionLayoutContext', () => ({
  useDiscussionLayoutSafe: () => null,
}));

describe('MetadataPanel', () => {
  const mockTopic: Topic = {
    id: 'topic-1',
    title: 'Test Topic',
    description: 'Test description',
    creatorId: 'user-1',
    status: 'ACTIVE',
    evidenceStandards: 'high',
    minimumDiversityScore: 0.5,
    currentDiversityScore: 0.7,
    participantCount: 10,
    responseCount: 25,
    crossCuttingThemes: [],
    createdAt: '2024-01-01',
    activatedAt: '2024-01-02',
    archivedAt: null,
  };

  const mockPropositions: PropositionItem[] = [
    {
      id: 'prop-1',
      statement: 'Test proposition',
      alignmentData: {
        supportCount: 10,
        opposeCount: 5,
        nuancedCount: 3,
        consensusScore: 0.7,
      },
      relatedResponseIds: ['resp-1', 'resp-2'],
    },
  ];

  const mockOnTabActivate = vi.fn();
  const mockOnPropositionHover = vi.fn();
  const mockOnPropositionClick = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should display empty state when no topic is selected', () => {
      render(<MetadataPanel topic={null} />);

      expect(screen.getByText('Select a topic to view metadata')).toBeInTheDocument();
    });
  });

  describe('Tab navigation', () => {
    it('should render all three tabs', () => {
      render(<MetadataPanel topic={mockTopic} />);

      expect(screen.getByText('Propositions')).toBeInTheDocument();
      expect(screen.getByText('Common Ground')).toBeInTheDocument();
      expect(screen.getByText('Bridging')).toBeInTheDocument();
    });

    it('should start with Propositions tab active', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const propositionsTab = screen.getByRole('tab', { name: /Propositions/i });
      expect(propositionsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Common Ground tab when clicked', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const commonGroundTab = screen.getByRole('tab', { name: /Common Ground/i });
      fireEvent.click(commonGroundTab);

      expect(commonGroundTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Bridging tab when clicked', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const bridgingTab = screen.getByRole('tab', { name: /Bridging/i });
      fireEvent.click(bridgingTab);

      expect(bridgingTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should call onTabActivate when tab is clicked', () => {
      render(<MetadataPanel topic={mockTopic} onTabActivate={mockOnTabActivate} />);

      const commonGroundTab = screen.getByRole('tab', { name: /Common Ground/i });
      fireEvent.click(commonGroundTab);

      expect(mockOnTabActivate).toHaveBeenCalledWith('commonGround');
    });
  });

  describe('Propositions tab', () => {
    it('should render PropositionList with propositions', () => {
      render(<MetadataPanel topic={mockTopic} propositions={mockPropositions} />);

      expect(screen.getByTestId('proposition-list')).toBeInTheDocument();
      expect(screen.getByText('Propositions: 1')).toBeInTheDocument();
    });

    it('should call onPropositionHover when proposition is hovered', () => {
      render(
        <MetadataPanel
          topic={mockTopic}
          propositions={mockPropositions}
          onPropositionHover={mockOnPropositionHover}
        />,
      );

      const hoverButton = screen.getByText('Hover Prop 1');
      fireEvent.click(hoverButton);

      expect(mockOnPropositionHover).toHaveBeenCalledWith('prop-1');
    });

    it('should call onPropositionClick when proposition is clicked', () => {
      render(
        <MetadataPanel
          topic={mockTopic}
          propositions={mockPropositions}
          onPropositionClick={mockOnPropositionClick}
        />,
      );

      const clickButton = screen.getByText('Click Prop 1');
      fireEvent.click(clickButton);

      expect(mockOnPropositionClick).toHaveBeenCalledWith('prop-1', ['resp-1']);
    });
  });

  describe('Common Ground tab', () => {
    it('should show loading state', () => {
      render(<MetadataPanel topic={mockTopic} isLoadingCommonGround />);

      const commonGroundTab = screen.getByRole('tab', { name: /Common Ground/i });
      fireEvent.click(commonGroundTab);

      expect(screen.getByText('Analyzing common ground...')).toBeInTheDocument();
    });

    it('should show empty state when no analysis', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const commonGroundTab = screen.getByRole('tab', { name: /Common Ground/i });
      fireEvent.click(commonGroundTab);

      expect(screen.getByText('No common ground analysis yet')).toBeInTheDocument();
    });

    it('should render CommonGroundSummaryPanel when analysis is provided', () => {
      const mockAnalysis: Record<string, unknown> = {
        consensusLevel: 'high',
        agreementZones: [],
        misunderstandings: [],
        disagreements: [],
      };

      render(<MetadataPanel topic={mockTopic} commonGroundAnalysis={mockAnalysis} />);

      const commonGroundTab = screen.getByRole('tab', { name: /Common Ground/i });
      fireEvent.click(commonGroundTab);

      expect(screen.getByTestId('common-ground-summary')).toBeInTheDocument();
    });
  });

  describe('Bridging tab', () => {
    it('should show loading state', () => {
      render(<MetadataPanel topic={mockTopic} isLoadingBridging />);

      const bridgingTab = screen.getByRole('tab', { name: /Bridging/i });
      fireEvent.click(bridgingTab);

      expect(screen.getByText('Generating bridging suggestions...')).toBeInTheDocument();
    });

    it('should show empty state when no suggestions', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const bridgingTab = screen.getByRole('tab', { name: /Bridging/i });
      fireEvent.click(bridgingTab);

      expect(screen.getByText('No bridging suggestions yet')).toBeInTheDocument();
    });

    it('should render BridgingSuggestionsSection when suggestions are provided', () => {
      const mockSuggestions: Record<string, unknown> = {
        suggestions: [{ id: 's1' }, { id: 's2' }],
      };

      render(<MetadataPanel topic={mockTopic} bridgingSuggestions={mockSuggestions} />);

      const bridgingTab = screen.getByRole('tab', { name: /Bridging/i });
      fireEvent.click(bridgingTab);

      expect(screen.getByTestId('bridging-suggestions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles for tabs', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(tablist).toHaveAttribute('aria-label', 'Discussion metadata');
    });

    it('should have proper ARIA controls for tab panels', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const propositionsTab = screen.getByRole('tab', { name: /Propositions/i });
      expect(propositionsTab).toHaveAttribute('aria-controls', 'propositions-panel');
    });

    it('should have matching tabpanel IDs', () => {
      render(<MetadataPanel topic={mockTopic} />);

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('id', 'propositions-panel');
    });
  });
});
