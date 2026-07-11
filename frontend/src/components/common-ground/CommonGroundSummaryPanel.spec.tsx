import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CommonGroundAnalysis } from '../../types/common-ground';
import CommonGroundSummaryPanel from './CommonGroundSummaryPanel';

// Mock ShareButton component
vi.mock('./ShareButton', () => ({
  default: () => <button>Share</button>,
}));

describe('CommonGroundSummaryPanel', () => {
  const mockAnalysis: CommonGroundAnalysis = {
    id: 'analysis-1',
    discussionId: 'disc-1',
    agreementZones: [
      {
        id: 'zone-1',
        title: 'Climate Action Urgency',
        description: 'Most participants agree that climate change requires immediate action',
        propositions: [
          {
            id: 'prop-1',
            text: 'Climate change is a serious threat',
            agreementPercentage: 85,
            supportingParticipants: [],
            opposingParticipants: [],
            neutralParticipants: [],
          },
          {
            id: 'prop-2',
            text: 'We need to reduce carbon emissions',
            agreementPercentage: 78,
            supportingParticipants: [],
            opposingParticipants: [],
            neutralParticipants: [],
          },
        ],
        participantCount: 25,
        consensusLevel: 'high',
        relatedResponseIds: ['resp-1', 'resp-2', 'resp-3'],
      },
    ],
    misunderstandings: [
      {
        id: 'mis-1',
        term: 'renewable energy',
        definitions: [
          {
            definition: 'Solar and wind power only',
            participants: ['user-1', 'user-2'],
          },
          {
            definition: 'All non-fossil fuel sources including nuclear',
            participants: ['user-3', 'user-4'],
          },
        ],
        clarificationSuggestion: 'Specify which energy sources are included',
      },
    ],
    disagreements: [
      {
        id: 'dis-1',
        topic: 'Economic vs Environmental Priorities',
        description:
          'Participants differ on whether economic growth or environmental protection should take priority',
        positions: [
          {
            stance: 'Economy first',
            reasoning: 'Economic stability is necessary before addressing environmental issues',
            underlyingValue: 'Economic security',
            underlyingAssumption:
              'Economic growth and environmental protection are mutually exclusive',
            participants: ['user-5', 'user-6'],
          },
          {
            stance: 'Environment first',
            reasoning: 'Environmental degradation will eventually harm the economy',
            underlyingValue: 'Environmental sustainability',
            underlyingAssumption: 'Environmental protection enables long-term economic prosperity',
            participants: ['user-7', 'user-8'],
          },
        ],
        moralFoundations: ['Care/Harm', 'Liberty/Oppression'],
      },
    ],
    lastUpdated: '2024-01-15T10:30:00Z',
    participantCount: 30,
    overallConsensusScore: 65,
  };

  describe('Overall Consensus Display', () => {
    it('should display overall consensus score', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Overall Consensus')).toBeInTheDocument();
    });

    it('should render the panel title', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('Common Ground Analysis')).toBeInTheDocument();
    });

    it('should display consensus score as a progress bar', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      // Overall consensus is the progressbar whose value is 65
      const overallBar = screen
        .getAllByRole('progressbar')
        .find((bar) => bar.getAttribute('aria-valuenow') === '65');

      expect(overallBar).toBeDefined();
      expect(overallBar).toHaveStyle({ width: '65%' });
      expect(overallBar).toHaveAttribute('aria-valuenow', '65');
    });

    it('should display participant count', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Participants')).toBeInTheDocument();
    });

    it('should display last updated timestamp when showLastUpdated=true', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} showLastUpdated />);

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });

    it('should hide last updated timestamp when showLastUpdated=false', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} showLastUpdated={false} />);

      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument();
    });
  });

  // NOTE: The component no longer uses a collapse/expand toggle. All sections
  // (agreement zones, misunderstandings, disagreements) are rendered directly.
  // The previous "View Full Analysis" toggle and summary-card behavior have been
  // removed from the component, so those cases are replaced by direct-render checks.
  describe('Section Rendering', () => {
    it('should render agreement zones section with count in the heading', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('Agreement Zones (1)')).toBeInTheDocument();
      // Detailed content is always visible (no toggle)
      expect(screen.getByText('Climate Action Urgency')).toBeInTheDocument();
      expect(screen.getByText('Climate change is a serious threat')).toBeInTheDocument();
    });

    it('should render misunderstandings section with count in the heading', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('Identified Misunderstandings (1)')).toBeInTheDocument();
    });

    it('should render disagreements section with count in the heading', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('Genuine Disagreements (1)')).toBeInTheDocument();
    });
  });

  describe('Agreement Zones', () => {
    it('should display agreement zone title and description', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('Climate Action Urgency')).toBeInTheDocument();
      expect(
        screen.getByText('Most participants agree that climate change requires immediate action'),
      ).toBeInTheDocument();
    });

    it('should display consensus level badge', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should display propositions with agreement percentages', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByText('Climate change is a serious threat')).toBeInTheDocument();
      expect(screen.getByText('85% agree')).toBeInTheDocument();

      expect(screen.getByText('We need to reduce carbon emissions')).toBeInTheDocument();
      expect(screen.getByText('78% agree')).toBeInTheDocument();
    });

    it('should display progress bars for each proposition', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      const progressBars = screen.getAllByRole('progressbar');

      // Find proposition progress bars (not the overall consensus one)
      const propProgressBars = progressBars.filter((bar) => {
        const value = bar.getAttribute('aria-valuenow');
        return value === '85' || value === '78';
      });

      expect(propProgressBars).toHaveLength(2);
    });

    it('should make agreement zone clickable when onAgreementZoneClick is provided', () => {
      const handleClick = vi.fn();
      render(
        <CommonGroundSummaryPanel analysis={mockAnalysis} onAgreementZoneClick={handleClick} />,
      );

      // The zone is an article; when clickable it gets the cursor-pointer class
      const zoneElement = screen.getByText('Climate Action Urgency').closest('[role="article"]');

      expect(zoneElement).toBeInTheDocument();
      expect(zoneElement).toHaveClass('cursor-pointer');

      fireEvent.click(zoneElement!);

      expect(handleClick).toHaveBeenCalledWith('zone-1', ['resp-1', 'resp-2', 'resp-3']);
    });

    it('should not add the cursor-pointer class when onAgreementZoneClick is absent', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      const zoneElement = screen.getByText('Climate Action Urgency').closest('[role="article"]');

      expect(zoneElement).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Misunderstandings', () => {
    beforeEach(() => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
    });

    it('should display misunderstanding term', () => {
      expect(screen.getByText('“renewable energy”')).toBeInTheDocument();
    });

    it('should display TERM CONFUSION badge', () => {
      expect(screen.getByText('TERM CONFUSION')).toBeInTheDocument();
    });

    it('should display different definitions', () => {
      expect(screen.getByText('Solar and wind power only')).toBeInTheDocument();
      expect(screen.getByText('All non-fossil fuel sources including nuclear')).toBeInTheDocument();
    });

    it('should display participant counts for each definition', () => {
      expect(screen.getAllByText('Used by 2 participant(s)')).toHaveLength(2);
    });

    it('should display clarification suggestion', () => {
      expect(screen.getByText(/Specify which energy sources are included/i)).toBeInTheDocument();
    });
  });

  describe('Disagreements', () => {
    beforeEach(() => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);
    });

    it('should display disagreement topic and description', () => {
      expect(screen.getByText('Economic vs Environmental Priorities')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Participants differ on whether economic growth or environmental protection should take priority',
        ),
      ).toBeInTheDocument();
    });

    it('should display VALUE DIFFERENCE badge', () => {
      expect(screen.getByText('VALUE DIFFERENCE')).toBeInTheDocument();
    });

    it('should display different positions', () => {
      expect(screen.getByText('Economy first')).toBeInTheDocument();
      expect(screen.getByText('Environment first')).toBeInTheDocument();
    });

    it('should display position reasoning', () => {
      expect(
        screen.getByText('Economic stability is necessary before addressing environmental issues'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Environmental degradation will eventually harm the economy'),
      ).toBeInTheDocument();
    });

    it('should display underlying values and assumptions', () => {
      expect(screen.getByText('Economic security')).toBeInTheDocument();
      expect(screen.getByText('Environmental sustainability')).toBeInTheDocument();
    });

    it('should display moral foundations', () => {
      expect(screen.getByText(/Care\/Harm, Liberty\/Oppression/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    const emptyAnalysis: CommonGroundAnalysis = {
      ...mockAnalysis,
      agreementZones: [],
      misunderstandings: [],
      disagreements: [],
    };

    it('should display empty state when no content and showEmptyState=true', () => {
      render(<CommonGroundSummaryPanel analysis={emptyAnalysis} showEmptyState />);

      expect(screen.getByText('No Analysis Available')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Common ground analysis will appear here once the discussion has enough participants/i,
        ),
      ).toBeInTheDocument();
    });

    it('should not render when no content and showEmptyState=false', () => {
      const { container } = render(
        <CommonGroundSummaryPanel analysis={emptyAnalysis} showEmptyState={false} />,
      );

      expect(
        container.querySelector('[data-testid="common-ground-summary"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Styling and Accessibility', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CommonGroundSummaryPanel analysis={mockAnalysis} className="custom-class" />,
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for agreement zones', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(screen.getByLabelText('Agreement zone: Climate Action Urgency')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for misunderstandings', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(
        screen.getByLabelText('Misunderstanding about term: renewable energy'),
      ).toBeInTheDocument();
    });

    it('should have proper ARIA labels for disagreements', () => {
      render(<CommonGroundSummaryPanel analysis={mockAnalysis} />);

      expect(
        screen.getByLabelText('Disagreement about: Economic vs Environmental Priorities'),
      ).toBeInTheDocument();
    });
  });
});
